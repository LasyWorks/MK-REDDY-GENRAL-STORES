/**
 * stockAlertService
 *
 * Central place for all stock-alert logic:
 *   - Deduplication: don't fire a second alert if one was sent < 1 day ago
 *   - Resend: if the product is still low/out after 1 day, send again
 *   - Resolution: when stock is restored above threshold, close open notifications
 *   - In-app: all events are persisted in admin_notifications
 *   - Email: admin emails are gathered from user table and sent via emailService
 */
const { AdminNotification, User } = require('../models');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const { query: dbQuery } = require('../config/database');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check a single product and fire an alert if stock is at or below threshold.
 * Safe to call on every stock change — handles all deduplication internally.
 *
 * @param {object} product  Full product row including stock_quantity, low_stock_threshold, name, etc.
 */
async function checkAndAlert(product) {
  try {
    const stock = parseFloat(product.stock_quantity ?? 0);
    const thresh = parseFloat(product.low_stock_threshold ?? 10);

    logger.info(`[stock-alert] checkAndAlert: product=${product.id} name="${product.name}" stock=${stock} threshold=${thresh}`);

    // Stock is fine — resolve any open notification and exit
    if (stock > thresh) {
      logger.info(`[stock-alert] stock OK (${stock} > ${thresh}), resolving any open notification.`);
      await AdminNotification.resolveForProduct(product.id).catch(() => {});
      return;
    }

    const alertType = stock <= 0 ? 'out' : 'low';
    const productName = product.name || product.name_en || 'Unknown Product';
    const variant = product.variant || product.unit_pack_size || '';
    const label = alertType === 'out' ? 'Out of Stock' : 'Low Stock';
    const title = `${label}: ${productName}${variant ? ` (${variant})` : ''}`;
    const message = alertType === 'out'
      ? `${productName} is out of stock (0 units).`
      : `${productName} has only ${stock} unit(s) left (threshold: ${thresh}).`;

    // Look for an existing unresolved notification for this product
    const existing = await AdminNotification.findUnresolved(product.id);
    logger.info(`[stock-alert] existing notification: ${existing ? `id=${existing.id} email_sent_at=${existing.email_sent_at}` : 'none'}`);

    if (existing) {
      // Notification already exists — check whether to resend the email
      // email_sent_at is NULL if the previous attempt never sent (e.g. crashed before delivery)
      const lastSent = existing.email_sent_at ? new Date(existing.email_sent_at).getTime() : 0;
      const msSinceSent = Date.now() - lastSent;
      logger.info(`[stock-alert] ms since last email: ${msSinceSent} (1-day window: ${ONE_DAY_MS}, never_sent=${!existing.email_sent_at})`);
      if (msSinceSent < ONE_DAY_MS && existing.email_sent_at) {
        logger.info('[stock-alert] within 1-day window — skipping reminder resend.');
        return;
      }
      // 1+ day has passed and still unresolved — rotate to a fresh notification row
      logger.info('[stock-alert] 1-day window passed — creating a fresh reminder notification.');
      await AdminNotification.resolveForProduct(product.id).catch(() => {});
      await AdminNotification.create({
        type: alertType,
        title,
        message,
        productId: product.id,
        stockAtAlert: stock,
      }).catch((err) => logger.error('[stock-alert] create reminder notification failed:', err));
    } else {
      // Brand-new alert — create the in-app notification
      logger.info('[stock-alert] new alert — creating notification row.');
      await AdminNotification.create({
        type: alertType,
        title,
        message,
        productId: product.id,
        stockAtAlert: stock,
      }).catch((err) => logger.error('[stock-alert] create notification failed:', err));
    }

    // Get admin emails and send
    const adminEmails = await User.findAdminEmails();
    logger.info(`[stock-alert] admin emails found: ${adminEmails.length} — [${adminEmails.join(', ')}]`);
    if (!adminEmails.length) {
      logger.warn('[stock-alert] no admin emails found — cannot send stock alert email.');
      return;
    }

    // Find the notification row ID so we can mark it sent after delivery
    const notifRow = await AdminNotification.findUnresolved(product.id);

    const result = await emailService.sendStockAlert(adminEmails, product, alertType);
    logger.info(`[stock-alert] email result: sent=${result.sent}/${result.total}`);

    if (result.sent > 0 && notifRow) {
      await AdminNotification.markEmailSent(notifRow.id).catch(() => {});
    }

  } catch (err) {
    logger.error('[stock-alert] checkAndAlert error:', err);
  }
}

/**
 * Run checkAndAlert for a list of product IDs.
 * Used by orderService after order creation to check every purchased product.
 * Fetches the latest DB state for each product to get accurate post-deduction stock.
 *
 * @param {string[]} productIds
 * @param {Function} findById  Product.findById function reference
 */
async function checkAndAlertMany(productIds, findById) {
  const unique = [...new Set(productIds.filter(Boolean))];
  for (const id of unique) {
    try {
      const product = await findById(id);
      if (product) await checkAndAlert(product);
    } catch (err) {
      logger.error(`[stock-alert] checkAndAlertMany failed for product ${id}:`, err);
    }
  }
}

/**
 * Scan the full catalog and trigger alerts for every active low/out-of-stock product.
 * Useful for startup backfill and manual admin recheck.
 */
async function runFullScan() {
  try {
    const rows = await dbQuery(
      `SELECT p.id, p.sku, p.variant, p.unit_pack_size,
              p.stock_quantity, p.low_stock_threshold,
              COALESCE(pt.name, p.sku, 'Unknown') AS name
       FROM products p
       LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
       WHERE p.is_active = TRUE
         AND p.stock_quantity <= COALESCE(p.low_stock_threshold, 10)
       ORDER BY p.stock_quantity ASC`
    );

    let alerted = 0;
    for (const row of rows) {
      const product = {
        id: row.id,
        name: row.name,
        sku: row.sku,
        variant: row.variant,
        unit_pack_size: row.unit_pack_size,
        stock_quantity: parseFloat(row.stock_quantity ?? 0),
        low_stock_threshold: parseFloat(row.low_stock_threshold ?? 10),
      };
      await checkAndAlert(product);
      alerted += 1;
    }

    logger.info(`[stock-alert] full scan complete: evaluated=${rows.length}, alerted=${alerted}`);
    return { scanned: rows.length, alerted };
  } catch (err) {
    logger.error('[stock-alert] runFullScan error:', err);
    throw err;
  }
}

module.exports = { checkAndAlert, checkAndAlertMany, runFullScan };

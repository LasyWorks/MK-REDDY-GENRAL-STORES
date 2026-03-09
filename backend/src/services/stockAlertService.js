/**
 * stockAlertService
 *
 * Central place for all stock-alert logic:
 *   - Deduplication: don't fire a second alert if one was sent < 3 days ago
 *   - Resend: if the product is still low/out after 3 days, send again
 *   - Resolution: when stock is restored above threshold, close open notifications
 *   - In-app: all events are persisted in admin_notifications
 *   - Email: admin emails are gathered from user table and sent via emailService
 */
const { AdminNotification, User } = require('../models');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

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
    const title = `${label}: ${productName}${variant ? ' - ' + variant : ''}`;
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
      logger.info(`[stock-alert] ms since last email: ${msSinceSent} (3-day window: ${THREE_DAYS_MS}, never_sent=${!existing.email_sent_at})`);
      if (msSinceSent < THREE_DAYS_MS && existing.email_sent_at) {
        logger.info('[stock-alert] within 3-day window — skipping email resend.');
        return;
      }
      // 3+ days have passed with no restock — bump the timestamp and resend
      logger.info('[stock-alert] 3-day window passed — resending email.');
      await AdminNotification.updateEmailSent(existing.id).catch(() => {});
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
    const notifRow = existing || await AdminNotification.findUnresolved(product.id);

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

module.exports = { checkAndAlert, checkAndAlertMany };

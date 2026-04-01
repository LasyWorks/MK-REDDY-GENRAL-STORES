const { query: dbQuery } = require('../config/database');
const { AdminNotification } = require('../models');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function checkOrder(order) {
  try {
    const type = 'pending_order';
    const title = `Pending Order Reminder: ${order.order_number}`;
    const message = `Order ${order.order_number} has remained ${order.status} for more than 1 day.`;

    const existing = await AdminNotification.findUnresolvedOrder(order.id, type);
    if (existing) {
      const lastSent = existing.email_sent_at ? new Date(existing.email_sent_at).getTime() : 0;
      const msSinceSent = Date.now() - lastSent;
      if (msSinceSent < ONE_DAY_MS && existing.email_sent_at) {
        return;
      }
      await AdminNotification.resolveForOrder(order.id, type).catch(() => {});
    }

    const created = await AdminNotification.create({
      type,
      title,
      message,
      productId: null,
      orderId: order.id,
      stockAtAlert: null,
    });

    const customerEmail = typeof order.customer_email === 'string' ? order.customer_email.trim() : '';
    if (customerEmail) {
      await emailService.sendPendingOrderReminder(
        order,
        { name: order.customer_name || 'Customer', email: customerEmail },
      ).catch((err) => logger.error('[pending-order-alert] customer reminder email failed:', err));
    }

    if (created?.id) {
      await AdminNotification.markEmailSent(created.id).catch(() => {});
    }
  } catch (err) {
    logger.error('[pending-order-alert] checkOrder error:', err);
  }
}

async function runFullScan() {
  try {
    const rows = await dbQuery(
      `SELECT o.id, o.order_number, o.status, o.created_at, o.total_amount,
              u.email AS customer_email, u.name AS customer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.status IN ('pending', 'confirmed')
         AND o.created_at <= NOW() - INTERVAL '1 day'
       ORDER BY o.created_at ASC`
    );

    let alerted = 0;
    for (const order of rows) {
      await checkOrder(order);
      alerted += 1;
    }

    logger.info(`[pending-order-alert] full scan complete: scanned=${rows.length}, processed=${alerted}`);
    return { scanned: rows.length, alerted };
  } catch (err) {
    logger.error('[pending-order-alert] runFullScan error:', err);
    throw err;
  }
}

module.exports = { checkOrder, runFullScan };
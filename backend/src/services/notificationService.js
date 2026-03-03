const SmsService = require('./smsService');
const config = require('../config');
const logger = require('../utils/logger');
const STATUS_MESSAGES = {
  confirmed: (order) =>
    `MK Kirana Stores: Your order #${order.order_number} has been confirmed. ` +
    `Total: ₹${order.total_amount}. We will notify you when it is ready for pickup.`,
  ready_for_pickup: (order) =>
    `MK Kirana Stores: Your order #${order.order_number} is ready for pickup! ` +
    `Please visit the store. Store: ${config.store.address}. Ph: ${config.store.phone}.`,
  picked_up: (order) =>
    `MK Kirana Stores: Thank you! Order #${order.order_number} has been handed over. ` +
    `Invoice amount: ₹${order.total_amount}. Thank you for shopping with us!`,
  cancelled: (order) =>
    `MK Kirana Stores: Your order #${order.order_number} has been cancelled. ` +
    `Reason: ${order.cancellation_reason || 'Cancelled by store'}. ` +
    `Contact us at ${config.store.phone} for help.`,
};
class NotificationService {
  static async sendOrderStatusSms(user, order) {
    if (!user?.phone) return;
    const messageFn = STATUS_MESSAGES[order.status];
    if (!messageFn) return;
    const message = messageFn(order);
    await SmsService.sendMessage(user.phone, message);
  }
  static async sendLowStockAlert(adminPhone, product) {
    const message =
      `MK Kirana Stores ALERT: Low stock for "${product.name_en}" ` +
      `(SKU: ${product.sku}). Only ${product.stock_quantity} ${product.unit_type} remaining.`;
    await SmsService.sendMessage(adminPhone, message);
  }
}
module.exports = NotificationService;

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
let twilioClient = null;
function getTwilioClient() {
  if (!twilioClient && config.whatsapp.provider === 'twilio') {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(config.whatsapp.accountSid, config.whatsapp.authToken);
    } catch {
      logger.warn('twilio package not installed — WhatsApp disabled');
    }
  }
  return twilioClient;
}
class NotificationService {
  static async sendOrderStatusSms(user, order) {
    if (!user?.phone) return;
    const messageFn = STATUS_MESSAGES[order.status];
    if (!messageFn) return;
    const message = messageFn(order);
    await SmsService.sendMessage(user.phone, message);
  }
  static async sendWhatsAppConfirmation(user, order) {
    if (!user?.phone || config.env === 'development') {
      logger.info(`[WA-DEV] WhatsApp confirmation for order #${order.order_number} → ${user?.phone}`);
      return;
    }
    const provider = config.whatsapp.provider;
    if (provider === 'twilio') {
      const client = getTwilioClient();
      if (!client) return;
      try {
        const body =
          `*MK Kirana Stores — Order Confirmed* 🛒\n` +
          `Order #: ${order.order_number}\n` +
          `Items: ${(order.items || []).length}\n` +
          `Total: ₹${order.total_amount}\n` +
          `Status: ${order.status}\n\n` +
          `We will notify you when your order is ready for pickup.\n` +
          `📍 ${config.store.address}`;
        await client.messages.create({
          from:  `whatsapp:${config.whatsapp.fromNumber}`,
          to:    `whatsapp:+91${user.phone}`,
          body,
        });
        logger.info(`WhatsApp confirmation sent to ${user.phone}`);
      } catch (err) {
        logger.error(`WhatsApp failed for ${user.phone}: ${err.message}`);
      }
    } else {
      const message =
        `MK Kirana Stores: Order #${order.order_number} placed! ` +
        `Total: ₹${order.total_amount}. We'll notify when ready for pickup. Ph: ${config.store.phone}`;
      await SmsService.sendMessage(user.phone, message);
    }
  }
  static async sendLowStockAlert(adminPhone, product) {
    const message =
      `MK Kirana Stores ALERT: Low stock for "${product.name_en}" ` +
      `(SKU: ${product.sku}). Only ${product.stock_quantity} ${product.unit_type} remaining.`;
    await SmsService.sendMessage(adminPhone, message);
  }
}
module.exports = NotificationService;
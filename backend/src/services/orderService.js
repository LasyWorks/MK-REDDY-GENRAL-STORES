const { Order, Cart, User, Invoice, AdminLog, Promotion } = require('../models');
const EmailService = require('./emailService');
const NotificationService = require('./notificationService');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
class OrderService {
  static async createOrder(userId, notes = null, lang = 'en') {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    const cart = await Cart.getWithItems(userId, lang);
    if (cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }
    // Final safety check before order creation - prices/stock may have changed
    const validation = await Cart.validateItems(userId);
    if (!validation.valid) {
      throw ApiError.badRequest('Cart has issues', validation.issues);
    }
    // Sync prices one last time to ensure customer pays current market price
    await Cart.syncPrices(userId);
    const updatedCart = await Cart.getWithItems(userId, lang);
    // Calculate best promotion discount for this order
    let promoDiscount = 0;
    let promoId = null;
    let promoTitle = null;
    try {
      const promoMap = await Promotion.getActiveProductMap();
      // Group items by promotion to calculate total discount per promotion
      const promoTotals = {};  
      for (const item of updatedCart.items) {
        const p = promoMap[item.product_id];
        if (!p) continue;
        const key = p.promotion_id;
        if (!promoTotals[key]) {
          promoTotals[key] = {
            discount: 0, title: p.title,
            discount_type: p.discount_type,
            discount_value: parseFloat(p.discount_value),
            qualifyingTotal: 0,
          };
        }
        promoTotals[key].qualifyingTotal += item.item_total;
      }
      // Calculate discount for each promotion and choose the best one for customer
      for (const [pid, info] of Object.entries(promoTotals)) {
        let d = 0;
        if (info.discount_type === 'flat') {
          d = Math.min(info.discount_value, info.qualifyingTotal);
        } else {
          d = parseFloat(((info.qualifyingTotal * info.discount_value) / 100).toFixed(2));
          d = Math.min(d, info.qualifyingTotal);
        }
        if (d > promoDiscount) {
          promoDiscount = parseFloat(d.toFixed(2));
          promoId = pid;
          promoTitle = info.title;
        }
      }
    } catch (err) {
      // Never fail order creation due to promotion errors - customer experience comes first
      logger.error('Promotion discount calc failed (order will proceed without discount):', err);
    }
    const { orderId, orderNumber } = await Order.createFromCart(userId, updatedCart, notes, {
      promotionId: promoId, promotionDiscount: promoDiscount, promotionTitle: promoTitle,
    });
    const order = await Order.findById(orderId, lang);
    await Invoice.create(order, user);
    logger.info(`Order created: ${orderNumber} by user ${userId}`);
    try {
      // Send email confirmation but don't fail order if email service is down
      if (user.email) {
        await EmailService.sendOrderConfirmation(order, user);
      }
    } catch (err) {
      logger.error('Email confirmation failed:', err);
    }
    try {
      // Notify admin about every new order regardless of customer email
      await EmailService.sendAdminOrderNotification(order, user);
    } catch (err) {
      logger.error('Admin order notification email failed:', err);
    }
    try {
      await NotificationService.sendWhatsAppConfirmation(user, order);
    } catch (err) {
      logger.error('WhatsApp confirmation failed:', err);
    }
    return order;
  }
  static async getById(orderId, lang = 'en') {
    const order = await Order.findById(orderId, lang);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    return order;
  }
  static async getByOrderNumber(orderNumber, lang = 'en') {
    const order = await Order.findByOrderNumber(orderNumber, lang);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    return order;
  }
  static async getUserOrders(userId, options = {}) {
    return Order.findByUser(userId, options);
  }
  static async getAllOrders(options = {}) {
    return Order.findAll(options);
  }
  static async updateStatus(orderId, status, notes = null, adminId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    // Define allowed status transitions to prevent invalid states (e.g., can't unpick a picked_up order)
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['picked_up', 'cancelled'],
      picked_up: [], // Final state - cannot change
      cancelled: [], // Final state - cannot change
    };
    if (!validTransitions[order.status].includes(status)) {
      throw ApiError.badRequest(
        `Cannot change order status from '${order.status}' to '${status}'`
      );
    }
    if (status === 'cancelled') {
      await Order.cancel(orderId, notes);
    } else {
      await Order.updateStatus(orderId, status, notes);
    }
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'order',
        entityId: orderId,
        oldValue: { status: order.status },
        newValue: { status, notes },
      });
    }
    const updatedOrder = await Order.findById(orderId);
    try {
      const user = await User.findById(order.user_id);
      await NotificationService.sendOrderStatusSms(user, updatedOrder);
      if (status === 'confirmed' && user.email) {
        await EmailService.sendOrderConfirmation(updatedOrder, user);
      }
    } catch (error) {
      logger.error('Failed to send order notification:', error);
    }
    return updatedOrder;
  }
  static async cancelOrder(orderId, reason, userId = null, adminId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    if (userId && order.user_id !== userId) {
      throw ApiError.forbidden('You can only cancel your own orders');
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw ApiError.badRequest('Order cannot be cancelled at this stage');
    }
    await Order.cancel(orderId, reason);
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'CANCEL_ORDER',
        entityType: 'order',
        entityId: orderId,
        oldValue: { status: order.status },
        newValue: { status: 'cancelled', reason },
      });
    }
    const cancelledOrder = await Order.findById(orderId);
    try {
      const user = await User.findById(order.user_id);
      // Notify admin about every cancellation
      await EmailService.sendAdminOrderCancellationNotification(cancelledOrder, user, reason);
      // Notify customer only if they have an email
      if (user.email) {
        await EmailService.sendCustomerOrderCancellationNotification(cancelledOrder, user, reason);
      }
    } catch (err) {
      logger.error('Cancellation email failed:', err);
    }
    return cancelledOrder;
  }
  static async getStatistics(startDate = null, endDate = null) {
    return Order.getStatistics(startDate, endDate);
  }
}
module.exports = OrderService;

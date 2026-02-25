const { Order, Cart, User, Invoice, AdminLog, Promotion } = require('../models');
const EmailService = require('./emailService');
const NotificationService = require('./notificationService');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class OrderService {
  /**
   * Create order from cart
   */
  static async createOrder(userId, notes = null, lang = 'en') {
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate cart
    const cart = await Cart.getWithItems(userId, lang);
    if (cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }

    // Validate stock
    const validation = await Cart.validateItems(userId);
    if (!validation.valid) {
      throw ApiError.badRequest('Cart has issues', validation.issues);
    }

    // Sync prices before order
    await Cart.syncPrices(userId);
    const updatedCart = await Cart.getWithItems(userId, lang);

    // ── Calculate promotion discount ──────────────────────────────
    let promoDiscount = 0;
    let promoId = null;
    let promoTitle = null;

    try {
      const promoMap = await Promotion.getActiveProductMap();
      // Group eligible items by promotion
      const promoTotals = {};  // { promoId: { discount, title, type, value, qualifyingTotal } }
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
      // Pick the promo giving the best discount
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
      logger.error('Promotion discount calc failed (order will proceed without discount):', err);
    }

    // Create order
    const { orderId, orderNumber } = await Order.createFromCart(userId, updatedCart, notes, {
      promotionId: promoId, promotionDiscount: promoDiscount, promotionTitle: promoTitle,
    });

    // Get created order
    const order = await Order.findById(orderId, lang);

    // Create invoice
    await Invoice.create(order, user);

    logger.info(`Order created: ${orderNumber} by user ${userId}`);

    // Email order confirmation
    try {
      if (user.email) {
        await EmailService.sendOrderConfirmation(order, user);
      }
    } catch (err) {
      logger.error('Email confirmation failed:', err);
    }

    // WhatsApp order confirmation
    try {
      await NotificationService.sendWhatsAppConfirmation(user, order);
    } catch (err) {
      logger.error('WhatsApp confirmation failed:', err);
    }

    return order;
  }

  /**
   * Get order by ID
   */
  static async getById(orderId, lang = 'en') {
    const order = await Order.findById(orderId, lang);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    return order;
  }

  /**
   * Get order by order number
   */
  static async getByOrderNumber(orderNumber, lang = 'en') {
    const order = await Order.findByOrderNumber(orderNumber, lang);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    return order;
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(userId, options = {}) {
    return Order.findByUser(userId, options);
  }

  /**
   * Get all orders (admin)
   */
  static async getAllOrders(options = {}) {
    return Order.findAll(options);
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, status, notes = null, adminId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['picked_up', 'cancelled'],
      picked_up: [], // Final state
      cancelled: [], // Final state
    };

    if (!validTransitions[order.status].includes(status)) {
      throw ApiError.badRequest(
        `Cannot change order status from '${order.status}' to '${status}'`
      );
    }

    // Handle cancellation
    if (status === 'cancelled') {
      await Order.cancel(orderId, notes);
    } else {
      await Order.updateStatus(orderId, status, notes);
    }

    // Log admin action
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

    // SMS status update (all transitions)
    try {
      const user = await User.findById(order.user_id);
      await NotificationService.sendOrderStatusSms(user, updatedOrder);

      // Also send email on confirmation
      if (status === 'confirmed' && user.email) {
        await EmailService.sendOrderConfirmation(updatedOrder, user);
      }
    } catch (error) {
      logger.error('Failed to send order notification:', error);
    }

    return updatedOrder;
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId, reason, userId = null, adminId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Check if user owns the order (for non-admin)
    if (userId && order.user_id !== userId) {
      throw ApiError.forbidden('You can only cancel your own orders');
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw ApiError.badRequest('Order cannot be cancelled at this stage');
    }

    await Order.cancel(orderId, reason);

    // Log admin action
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

    return Order.findById(orderId);
  }

  /**
   * Get order statistics
   */
  static async getStatistics(startDate = null, endDate = null) {
    return Order.getStatistics(startDate, endDate);
  }
}

module.exports = OrderService;

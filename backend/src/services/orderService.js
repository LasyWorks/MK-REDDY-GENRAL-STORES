const { Order, Cart, User, Invoice, AdminLog } = require('../models');
const EmailService = require('./emailService');
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

    // Create order
    const { orderId, orderNumber } = await Order.createFromCart(userId, updatedCart, notes);

    // Get created order
    const order = await Order.findById(orderId, lang);

    // Create invoice
    await Invoice.create(order, user);

    logger.info(`Order created: ${orderNumber} by user ${userId}`);

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

    // Send email notification on confirmation
    if (status === 'confirmed') {
      try {
        const user = await User.findById(order.user_id);
        if (user.email) {
          await EmailService.sendOrderConfirmation(updatedOrder, user);
        }
      } catch (error) {
        logger.error('Failed to send order confirmation email:', error);
      }
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

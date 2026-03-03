const { Order, Cart, User, Invoice, AdminLog, Promotion } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const emailService = require('./emailService');
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
    let promoFreeProductId = null;
    // Track which products qualify for a deal (for claiming after order is placed)
    const dealClaimsNeeded = []; // [{promotionId, productId}]
    try {
      const promoMap = await Promotion.getActiveProductMap();
      // Group items by promotion to calculate total discount per promotion
      const promoTotals = {};
      for (const item of updatedCart.items) {
        const p = promoMap[item.product_id];
        // Skip: no promo or deal-order cap exhausted
        if (!p || p.deal_exhausted) continue;
        // For percentage promos, also guard per-item unit cap.
        // Flat promos are order-level (not per-unit), so skip item_limit check for them.
        if (p.discount_type !== 'flat' && p.item_limit !== null && (p.items_claimed + item.quantity) > p.item_limit) continue;
        const key = p.promotion_id;
        if (!promoTotals[key]) {
          promoTotals[key] = {
            discount: 0, title: p.title,
            discount_type: p.discount_type,
            discount_value: parseFloat(p.discount_value),
            qualifyingTotal: 0,
            products: [],
          };
        }
        promoTotals[key].qualifyingTotal += item.item_total;
        promoTotals[key].products.push({ promotionId: key, productId: item.product_id, qty: item.quantity });
      }
      // Calculate discount for each promotion and choose the best one for customer
      for (const [pid, info] of Object.entries(promoTotals)) {
        let d = 0;
        if (info.discount_type === 'flat') {
          // ₹X off per qualifying PRODUCT in cart (regardless of qty of that product).
          // e.g. 2 products × ₹25 = ₹50 off; 1 product qty 10 = still ₹25 off.
          d = Math.min(info.discount_value * info.products.length, info.qualifyingTotal);
        } else {
          d = parseFloat(((info.qualifyingTotal * info.discount_value) / 100).toFixed(2));
          d = Math.min(d, info.qualifyingTotal);
        }
        if (d > promoDiscount) {
          promoDiscount = parseFloat(d.toFixed(2));
          promoId = pid;
          promoTitle = info.title;
          dealClaimsNeeded.length = 0;
          if (info.discount_type === 'flat') {
            // Flat = one order-level deal slot regardless of product count.
            // items_claimed tracks total units across all qualifying products.
            const totalQty = info.products.reduce((s, p) => s + p.qty, 0);
            dealClaimsNeeded.push({
              promotionId: pid,
              productId: info.products[0].productId,
              qty: totalQty,
              isFlat: true,
            });
          } else {
            // Percentage = per-product deal; claim once per qualifying product.
            dealClaimsNeeded.push(...info.products);
          }
        }
      }
      // Also evaluate threshold promotions (entire-cart discount based on cart total)
      const thresholdPromos = await Promotion.getActiveThresholdPromos();
      if (thresholdPromos.length > 0) {
        const cartSubtotal = updatedCart.items.reduce((s, i) => s + parseFloat(i.item_total), 0);
        for (const tp of thresholdPromos) {
          const minAmt = parseFloat(tp.min_order_amount || 0);
          if (minAmt <= 0) continue; // not properly configured — skip
          if (cartSubtotal < minAmt) continue; // threshold not reached
          if (tp.reward_type === 'free_item') {
            // Free item — no monetary discount; only claim if no monetary promo already applied
            if (promoDiscount === 0 && !promoFreeProductId) {
              promoId = tp.id;
              promoTitle = tp.title;
              promoFreeProductId = tp.free_product_id || null;
              dealClaimsNeeded.length = 0;
            }
          } else {
            let d = 0;
            if (tp.reward_type === 'cash_off') {
              d = Math.min(parseFloat(tp.discount_value), cartSubtotal);
            } else if (tp.reward_type === 'percentage') {
              d = parseFloat(((cartSubtotal * parseFloat(tp.discount_value)) / 100).toFixed(2));
              d = Math.min(d, cartSubtotal);
            } else {
              d = Math.min(parseFloat(tp.discount_value || 0), cartSubtotal);
            }
            if (d > promoDiscount) {
              promoDiscount = parseFloat(d.toFixed(2));
              promoId = tp.id;
              promoTitle = tp.title;
              promoFreeProductId = null; // monetary discount overrides free item
              dealClaimsNeeded.length = 0;
            }
          }
        }
      }
    } catch (err) {
      // Never fail order creation due to promotion errors - customer experience comes first
      logger.error('Promotion discount calc failed (order will proceed without discount):', err);
    }
    const { orderId, orderNumber } = await Order.createFromCart(userId, updatedCart, notes, {
      promotionId: promoId, promotionDiscount: promoDiscount, promotionTitle: promoTitle,
      freeProductId: promoFreeProductId,
    });
    const order = await Order.findById(orderId, lang);
    await Invoice.create(order, user);

    // Atomically claim limited deals for each qualifying product.
    // Fire-and-forget: failures must not block the order response.
    if (dealClaimsNeeded.length > 0) {
      Promise.all(
        dealClaimsNeeded.map(({ promotionId, productId, qty }) =>
          Promotion.claimDeal(promotionId, productId, qty || 1).catch((err) =>
            logger.warn(`Deal claim failed (promo=${promotionId}, product=${productId}):`, err)
          )
        )
      ).catch(() => {/* already caught per-item above */});
    }

    // Fire-and-forget emails — never block the order response
    User.findAdminEmails()
      .then(adminEmails => Promise.allSettled([
        emailService.sendAdminOrderNotification(order, user, adminEmails),
        user.email ? emailService.sendOrderConfirmation(order, user) : Promise.resolve(),
      ]))
      .catch(() => {});

    logger.info(`Order created: ${orderNumber} by user ${userId}`);
    return order;
  }
  static async getById(orderId, lang = 'en') {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orderId || !UUID_RE.test(orderId)) {
      throw ApiError.notFound('Order not found');
    }
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
    // Email customer the moment their order is ready for pickup — no matter what
    if (status === 'ready_for_pickup') {
      const customer = await User.findById(order.user_id);
      if (customer) {
        const readyOrder = await Order.findById(orderId);
        emailService.sendOrderReadyNotification(readyOrder, customer)
          .catch((err) => logger.error('Ready-for-pickup email failed:', err));
      }
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
    return cancelledOrder;
  }
  static async getStatistics(startDate = null, endDate = null) {
    return Order.getStatistics(startDate, endDate);
  }
}
module.exports = OrderService;

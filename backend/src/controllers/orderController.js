const { OrderService } = require('../services');
const birthdayOfferService = require('../services/birthdayOfferService');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const createOrder = asyncHandler(async (req, res) => {
  const { notes, birthday_coupon_code } = req.body;
  const lang = req.language || 'en';
  const userType = req.user.userType || 'retail';
  const order = await OrderService.createOrder(
    req.user.id,
    notes,
    lang,
    userType,
    birthday_coupon_code || null,
  );
  ApiResponse.created(res, order, 'Order placed successfully');
});
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { status } = req.query;
  const lang = req.language || 'en';
  const result = await OrderService.getUserOrders(req.user.id, { page, limit, status, lang });
  ApiResponse.paginated(res, result.orders, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { status, user_id, start_date, end_date, date_from, date_to, search } = req.query;
  const lang = req.language || 'en';
  const result = await OrderService.getAllOrders({
    page,
    limit,
    status,
    userId: user_id,
    startDate: start_date || date_from,
    endDate: end_date || date_to,
    search,
    lang,
  });
  ApiResponse.paginated(res, result.orders, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getOrder = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const order = await OrderService.getById(req.params.id, lang);
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }
  ApiResponse.success(res, order);
});
const getOrderByNumber = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const order = await OrderService.getByOrderNumber(req.params.orderNumber, lang);
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }
  ApiResponse.success(res, order);
});
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const order = await OrderService.updateStatus(req.params.id, status, notes, req.user.id);
  ApiResponse.success(res, order, 'Order status updated');
});
const cancelOrder = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const order = await OrderService.cancelOrder(
    req.params.id,
    req.body,
    isAdmin ? null : req.user.id,
    isAdmin ? req.user.id : null
  );
  ApiResponse.success(res, order, 'Order cancelled');
});
const getStatistics = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const stats = await OrderService.getStatistics(start_date, end_date);
  ApiResponse.success(res, stats);
});

const previewBirthdayCoupon = asyncHandler(async (req, res) => {
  const { coupon_code, cart_subtotal } = req.body || {};
  if (!coupon_code) {
    return ApiResponse.error(res, 'coupon_code is required', 400);
  }

  const preview = await birthdayOfferService.previewCouponDiscount({
    userId: req.user.id,
    couponCode: coupon_code,
    cartSubtotal: Number(cart_subtotal || 0),
  });

  if (!preview) {
    return ApiResponse.error(res, 'Invalid or unavailable birthday coupon', 400);
  }

  ApiResponse.success(res, preview);
});

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
  getStatistics,
  previewBirthdayCoupon,
};

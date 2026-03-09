const { OrderService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const createOrder = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const lang = req.language || 'en';
  const order = await OrderService.createOrder(req.user.id, notes, lang);
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
  const { reason } = req.body;
  const isAdmin = req.user.role === 'admin';
  const order = await OrderService.cancelOrder(
    req.params.id,
    reason,
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
module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
  getStatistics,
};

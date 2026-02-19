const { OrderService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');

/**
 * @desc    Create order from cart
 * @route   POST /api/v1/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const lang = req.language || 'en';
  const order = await OrderService.createOrder(req.user.id, notes, lang);
  ApiResponse.created(res, order, 'Order placed successfully');
});

/**
 * @desc    Get user's orders
 * @route   GET /api/v1/orders/my-orders
 * @access  Private
 */
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

/**
 * @desc    Get all orders (admin)
 * @route   GET /api/v1/orders
 * @access  Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { status, user_id, start_date, end_date } = req.query;
  const lang = req.language || 'en';

  const result = await OrderService.getAllOrders({
    page,
    limit,
    status,
    userId: user_id,
    startDate: start_date,
    endDate: end_date,
    lang,
  });

  ApiResponse.paginated(res, result.orders, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Get order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private (Owner or Admin)
 */
const getOrder = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const order = await OrderService.getById(req.params.id, lang);

  // Check if user owns the order or is admin
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }

  ApiResponse.success(res, order);
});

/**
 * @desc    Get order by order number
 * @route   GET /api/v1/orders/number/:orderNumber
 * @access  Private (Owner or Admin)
 */
const getOrderByNumber = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const order = await OrderService.getByOrderNumber(req.params.orderNumber, lang);

  // Check if user owns the order or is admin
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }

  ApiResponse.success(res, order);
});

/**
 * @desc    Update order status
 * @route   PUT /api/v1/orders/:id/status
 * @access  Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const order = await OrderService.updateStatus(req.params.id, status, notes, req.user.id);
  ApiResponse.success(res, order, 'Order status updated');
});

/**
 * @desc    Cancel order
 * @route   POST /api/v1/orders/:id/cancel
 * @access  Private (Owner or Admin)
 */
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

/**
 * @desc    Get order statistics
 * @route   GET /api/v1/orders/statistics
 * @access  Admin
 */
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

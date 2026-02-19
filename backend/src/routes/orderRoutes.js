const express = require('express');
const router = express.Router();
const { orderController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateCreateOrder, validateUpdateOrderStatus, validateCancelOrder } = require('../utils/validators');

// Customer routes (require authentication)
router.use(authenticate);

/**
 * @route   POST /api/v1/orders
 * @desc    Create order from cart
 * @access  Private (Customers only)
 */
router.post('/', authorize('retail_customer', 'wholesale_customer'), validateCreateOrder, orderController.createOrder);

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get current user's orders
 * @access  Private
 */
router.get('/my-orders', authorize('retail_customer', 'wholesale_customer'), orderController.getMyOrders);

/**
 * @route   GET /api/v1/orders/statistics
 * @desc    Get order statistics
 * @access  Admin
 */
router.get('/statistics', authorize('admin'), orderController.getStatistics);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (admin only)
 * @access  Admin
 */
router.get('/', authorize('admin'), orderController.getAllOrders);

/**
 * @route   GET /api/v1/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (Owner or Admin)
 */
router.get('/number/:orderNumber', orderController.getOrderByNumber);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:id', orderController.getOrder);

/**
 * @route   PUT /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/:id/status', authorize('admin'), validateUpdateOrderStatus, orderController.updateOrderStatus);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (Owner can cancel pending orders, Admin can cancel any)
 */
router.post('/:id/cancel', validateCancelOrder, orderController.cancelOrder);

module.exports = router;

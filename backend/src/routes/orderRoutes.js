const express = require('express');
const router = express.Router();
const { orderController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateCreateOrder, validateUpdateOrderStatus, validateCancelOrder } = require('../utils/validators');
router.use(authenticate);
// Allow admins to create and view their own orders (for testing or personal purchases)
router.post('/', authorize('retail_customer', 'wholesale_customer', 'admin'), validateCreateOrder, orderController.createOrder);
router.get('/my-orders', authorize('retail_customer', 'wholesale_customer', 'admin'), orderController.getMyOrders);
router.get('/statistics', authorize('admin'), orderController.getStatistics);
router.get('/', authorize('admin'), orderController.getAllOrders);
router.get('/number/:orderNumber', orderController.getOrderByNumber);
router.get('/:id', orderController.getOrder);
router.put('/:id/status', authorize('admin'), validateUpdateOrderStatus, orderController.updateOrderStatus);
router.post('/:id/cancel', validateCancelOrder, orderController.cancelOrder);
module.exports = router;

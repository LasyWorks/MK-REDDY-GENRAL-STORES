const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateCreateUser, validateUpdateUser } = require('../utils/validators');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filters
 * @access  Admin
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Admin
 */
router.get('/stats', userController.getUserStats);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/:id', userController.getUserById);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user (admin can create other admins/customers)
 * @access  Admin
 */
router.post('/', validateCreateUser, userController.createUser);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put('/:id', validateUpdateUser, userController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin
 */
router.delete('/:id', userController.deleteUser);

/**
 * @route   PUT /api/v1/users/:id/block
 * @desc    Block user
 * @access  Admin
 */
router.put('/:id/block', userController.blockUser);

/**
 * @route   PUT /api/v1/users/:id/unblock
 * @desc    Unblock user
 * @access  Admin
 */
router.put('/:id/unblock', userController.unblockUser);

/**
 * @route   PUT /api/v1/users/:id/activate
 * @desc    Activate user
 * @access  Admin
 */
router.put('/:id/activate', userController.activateUser);

/**
 * @route   PUT /api/v1/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Admin
 */
router.put('/:id/deactivate', userController.deactivateUser);

/**
 * @route   PUT /api/v1/users/:id/customer-type
 * @desc    Update customer type (retail/wholesale)
 * @access  Admin
 */
router.put('/:id/customer-type', userController.updateCustomerType);

/**
 * @route   GET /api/v1/users/:id/orders
 * @desc    Get user's order history
 * @access  Admin
 */
router.get('/:id/orders', userController.getUserOrders);

module.exports = router;

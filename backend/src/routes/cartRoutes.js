const express = require('express');
const router = express.Router();
const { cartController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateAddToCart, validateUpdateCartItem } = require('../utils/validators');

// All cart routes require authentication
router.use(authenticate);
router.use(authorize('retail_customer', 'wholesale_customer'));

/**
 * @route   GET /api/v1/cart
 * @desc    Get current user's cart
 * @access  Private
 */
router.get('/', cartController.getCart);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/items', validateAddToCart, cartController.addItem);

/**
 * @route   PUT /api/v1/cart/items/:productId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/items/:productId', validateUpdateCartItem, cartController.updateItem);

/**
 * @route   DELETE /api/v1/cart/items/:productId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/items/:productId', cartController.removeItem);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/', cartController.clearCart);

/**
 * @route   POST /api/v1/cart/sync-prices
 * @desc    Sync cart prices with current product prices
 * @access  Private
 */
router.post('/sync-prices', cartController.syncPrices);

/**
 * @route   POST /api/v1/cart/sync-all
 * @desc    Replace backend cart with frontend state (pre-checkout)
 * @access  Private
 */
router.post('/sync-all', cartController.syncAll);

/**
 * @route   GET /api/v1/cart/validate
 * @desc    Validate cart (check stock, prices)
 * @access  Private
 */
router.get('/validate', cartController.validateCart);

module.exports = router;

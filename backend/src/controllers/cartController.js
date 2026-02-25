const { CartService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');

/**
 * @desc    Get user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const cart = await CartService.getCart(req.user.id, lang);
  ApiResponse.success(res, cart);
});

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart/items
 * @access  Private
 */
const addItem = asyncHandler(async (req, res) => {
  const { product_id, quantity } = req.body;
  const cart = await CartService.addItem(req.user.id, product_id, quantity);
  ApiResponse.success(res, cart, 'Item added to cart');
});

/**
 * @desc    Update item quantity
 * @route   PUT /api/v1/cart/items/:productId
 * @access  Private
 */
const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await CartService.updateItem(req.user.id, req.params.productId, quantity);
  ApiResponse.success(res, cart, 'Cart updated');
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/items/:productId
 * @access  Private
 */
const removeItem = asyncHandler(async (req, res) => {
  const cart = await CartService.removeItem(req.user.id, req.params.productId);
  ApiResponse.success(res, cart, 'Item removed from cart');
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
  await CartService.clearCart(req.user.id);
  ApiResponse.success(res, null, 'Cart cleared');
});

/**
 * @desc    Sync cart prices
 * @route   POST /api/v1/cart/sync-prices
 * @access  Private
 */
const syncPrices = asyncHandler(async (req, res) => {
  const cart = await CartService.syncPrices(req.user.id);
  ApiResponse.success(res, cart, 'Cart prices synced');
});

/**
 * @desc    Validate cart for checkout
 * @route   POST /api/v1/cart/validate
 * @access  Private
 */
const validateCart = asyncHandler(async (req, res) => {
  const result = await CartService.validateForCheckout(req.user.id);
  ApiResponse.success(res, result);
});

/**
 * @desc    Full-replace backend cart with frontend state (pre-checkout sync)
 * @route   POST /api/v1/cart/sync-all
 * @access  Private
 */
const syncAll = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const cart = await CartService.syncAll(req.user.id, items);
  ApiResponse.success(res, cart, 'Cart synced');
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  syncPrices,
  validateCart,
  syncAll,
};

const { CartService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const getCart = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const cart = await CartService.getCart(req.user.id, lang);
  ApiResponse.success(res, cart);
});
const addItem = asyncHandler(async (req, res) => {
  const { product_id, quantity } = req.body;
  const cart = await CartService.addItem(req.user.id, product_id, quantity);
  ApiResponse.success(res, cart, 'Item added to cart');
});
const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await CartService.updateItem(req.user.id, req.params.productId, quantity);
  ApiResponse.success(res, cart, 'Cart updated');
});
const removeItem = asyncHandler(async (req, res) => {
  const cart = await CartService.removeItem(req.user.id, req.params.productId);
  ApiResponse.success(res, cart, 'Item removed from cart');
});
const clearCart = asyncHandler(async (req, res) => {
  await CartService.clearCart(req.user.id);
  ApiResponse.success(res, null, 'Cart cleared');
});
const syncPrices = asyncHandler(async (req, res) => {
  const cart = await CartService.syncPrices(req.user.id);
  ApiResponse.success(res, cart, 'Cart prices synced');
});
const validateCart = asyncHandler(async (req, res) => {
  const result = await CartService.validateForCheckout(req.user.id);
  ApiResponse.success(res, result);
});
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
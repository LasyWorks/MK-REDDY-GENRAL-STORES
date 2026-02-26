const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');
class CartService {
  static async getCart(userId, lang = 'en') {
    return Cart.getWithItems(userId, lang);
  }
  static async addItem(userId, productId, quantity) {
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    if (!product.is_active) {
      throw ApiError.badRequest('Product is not available');
    }
    const existingItem = await Cart.getItem(userId, productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;
    if (product.stock_quantity < totalQuantity) {
      throw ApiError.badRequest(
        `Insufficient stock. Only ${product.stock_quantity} available.`
      );
    }
    if (product.max_order_quantity && totalQuantity > product.max_order_quantity) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`
      );
    }
    await Cart.addItem(userId, productId, quantity, product.price);
    return this.getCart(userId);
  }
  static async updateItem(userId, productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    if (product.stock_quantity < quantity) {
      throw ApiError.badRequest(
        `Insufficient stock. Only ${product.stock_quantity} available.`
      );
    }
    if (product.max_order_quantity && quantity > product.max_order_quantity) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`
      );
    }
    await Cart.updateItem(userId, productId, quantity);
    return this.getCart(userId);
  }
  static async removeItem(userId, productId) {
    const result = await Cart.removeItem(userId, productId);
    if (result === 0) {
      throw ApiError.notFound('Item not found in cart');
    }
    return this.getCart(userId);
  }
  static async clearCart(userId) {
    await Cart.clear(userId);
    return { message: 'Cart cleared successfully' };
  }
  static async syncPrices(userId) {
    await Cart.syncPrices(userId);
    return this.getCart(userId);
  }
  static async validateForCheckout(userId) {
    const cart = await this.getCart(userId);
    if (cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }
    const validation = await Cart.validateItems(userId);
    if (!validation.valid) {
      throw ApiError.badRequest('Cart has issues that need to be resolved', validation.issues);
    }
    const priceChanges = cart.items.filter(item => item.price_changed);
    if (priceChanges.length > 0) {
      await Cart.syncPrices(userId);
      return {
        valid: true,
        warning: 'Some item prices have changed. Cart has been updated with current prices.',
        cart: await this.getCart(userId),
      };
    }
    return {
      valid: true,
      cart,
    };
  }
  static async syncAll(userId, items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('Items array is required');
    }
    await Cart.replaceAll(userId, items);
    return this.getCart(userId);
  }
}
module.exports = CartService;
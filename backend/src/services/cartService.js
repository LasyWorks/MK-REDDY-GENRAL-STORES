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
    // Don't let customers add discontinued or hidden products to cart
    if (!product.is_active) {
      throw ApiError.badRequest('Product is not available');
    }
    // Check if item already in cart to calculate total requested quantity
    const existingItem = await Cart.getItem(userId, productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;
    // Prevent overselling - ensure we have enough physical inventory
    if (product.stock_quantity < totalQuantity) {
      throw ApiError.badRequest(
        `Insufficient stock. Only ${product.stock_quantity} available.`
      );
    }
    // Some products have bulk limits (e.g., promotional items limited to 5 per customer)
    if (product.max_order_quantity && totalQuantity > product.max_order_quantity) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`
      );
    }
    await Cart.addItem(userId, productId, quantity, product.price);
    return this.getCart(userId);
  }
  static async updateItem(userId, productId, quantity) {
    // Treat zero or negative quantity as removal to keep cart clean
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
    // Update cart with current prices - important when prices change between add-to-cart and checkout
    await Cart.syncPrices(userId);
    return this.getCart(userId);
  }
  static async validateForCheckout(userId) {
    const cart = await this.getCart(userId);
    if (cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }
    // Double-check stock availability before allowing checkout (inventory may have changed)
    const validation = await Cart.validateItems(userId);
    if (!validation.valid) {
      throw ApiError.badRequest('Cart has issues that need to be resolved', validation.issues);
    }
    // Alert customer if prices changed since they added items
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

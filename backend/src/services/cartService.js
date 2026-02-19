const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');

class CartService {
  /**
   * Get user's cart
   */
  static async getCart(userId, lang = 'en') {
    return Cart.getWithItems(userId, lang);
  }

  /**
   * Add item to cart
   */
  static async addItem(userId, productId, quantity) {
    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (!product.is_active) {
      throw ApiError.badRequest('Product is not available');
    }

    // Check stock
    const existingItem = await Cart.getItem(userId, productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;

    if (product.stock_quantity < totalQuantity) {
      throw ApiError.badRequest(
        `Insufficient stock. Only ${product.stock_quantity} available.`
      );
    }

    // Check max order quantity
    if (product.max_order_quantity && totalQuantity > product.max_order_quantity) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`
      );
    }

    // Add to cart
    await Cart.addItem(userId, productId, quantity, product.price);

    return this.getCart(userId);
  }

  /**
   * Update item quantity
   */
  static async updateItem(userId, productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Check stock
    if (product.stock_quantity < quantity) {
      throw ApiError.badRequest(
        `Insufficient stock. Only ${product.stock_quantity} available.`
      );
    }

    // Check max order quantity
    if (product.max_order_quantity && quantity > product.max_order_quantity) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`
      );
    }

    await Cart.updateItem(userId, productId, quantity);

    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  static async removeItem(userId, productId) {
    const result = await Cart.removeItem(userId, productId);
    
    if (result === 0) {
      throw ApiError.notFound('Item not found in cart');
    }

    return this.getCart(userId);
  }

  /**
   * Clear cart
   */
  static async clearCart(userId) {
    await Cart.clear(userId);
    return { message: 'Cart cleared successfully' };
  }

  /**
   * Sync cart prices with current product prices
   */
  static async syncPrices(userId) {
    await Cart.syncPrices(userId);
    return this.getCart(userId);
  }

  /**
   * Validate cart for checkout
   */
  static async validateForCheckout(userId) {
    const cart = await this.getCart(userId);

    if (cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }

    // Check for issues
    const validation = await Cart.validateItems(userId);

    if (!validation.valid) {
      throw ApiError.badRequest('Cart has issues that need to be resolved', validation.issues);
    }

    // Check for price changes
    const priceChanges = cart.items.filter(item => item.price_changed);
    if (priceChanges.length > 0) {
      // Auto-sync prices
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
}

module.exports = CartService;

const { Cart, Product } = require("../models");
const StoreSetting = require("../models/StoreSetting");
const ApiError = require("../utils/ApiError");
const { parseVariantToKg } = require("../utils/helpers");
class CartService {
  static async getCart(userId, lang = "en", userType = "retail") {
    const gstConfig = await StoreSetting.getGstConfig();
    return Cart.getWithItems(userId, lang, gstConfig, userType);
  }
  static async addItem(userId, productId, quantity, userType = "retail") {
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    if (!product.is_active) {
      throw ApiError.badRequest("Product is not available");
    }
    if (product.unit_type === 'loose') {
      const kgPerUnit = parseVariantToKg(product.variant);
      if (kgPerUnit !== null) {
        const rootId = product.parent_product_id || product.id;
        const rootProduct = product.parent_product_id
          ? await Product.findById(rootId)
          : product;
        const existingItem = await Cart.getItem(userId, productId);
        const existingQty = parseFloat(existingItem?.quantity || 0);
        const newTotalKg = (existingQty + quantity) * kgPerUnit;
        const otherReservedKg = await Cart.getLooseReservedKgExcluding(userId, rootId, productId);
        const availableKg = parseFloat(rootProduct.stock_quantity) - otherReservedKg;
        if (newTotalKg > availableKg) {
          const availStr = availableKg <= 0
            ? 'none'
            : availableKg < 1
              ? `${Math.round(availableKg * 1000)} g`
              : `${availableKg.toFixed(3)} kg`;
          throw ApiError.badRequest(`Insufficient stock. Only ${availStr} available.`);
        }
      } else {
        const existingItem = await Cart.getItem(userId, productId);
        const totalQuantity = (existingItem?.quantity || 0) + quantity;
        if (product.stock_quantity < totalQuantity) {
          throw ApiError.badRequest(`Insufficient stock. Only ${product.stock_quantity} available.`);
        }
      }
    } else {
      const existingItem = await Cart.getItem(userId, productId);
      const totalQuantity = (existingItem?.quantity || 0) + quantity;
      if (product.stock_quantity < totalQuantity) {
        throw ApiError.badRequest(`Insufficient stock. Only ${product.stock_quantity} available.`);
      }
    }
    if (
      product.max_order_quantity &&
      quantity > product.max_order_quantity
    ) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`,
      );
    }
    let unitPrice = parseFloat(product.price);
    if (userType === 'wholesale') {
      if (product.wholesale_price) {
        unitPrice = parseFloat(product.wholesale_price);
      } else {
        const setting = await StoreSetting.get('wholesale_discount_pct');
        const wsPct = setting ? parseFloat(setting.value) || 0 : 0;
        if (wsPct > 0) {
          unitPrice = parseFloat((unitPrice * (1 - wsPct / 100)).toFixed(2));
        }
      }
    }
    await Cart.addItem(userId, productId, quantity, unitPrice);
    return this.getCart(userId, "en", userType);
  }
  static async updateItem(userId, productId, quantity, userType = "retail") {
    if (quantity <= 0) {
      return this.removeItem(userId, productId, userType);
    }
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    if (product.unit_type === 'loose') {
      const kgPerUnit = parseVariantToKg(product.variant);
      if (kgPerUnit !== null) {
        const rootId = product.parent_product_id || product.id;
        const rootProduct = product.parent_product_id
          ? await Product.findById(rootId)
          : product;
        const requestedKg = quantity * kgPerUnit;
        const otherReservedKg = await Cart.getLooseReservedKgExcluding(userId, rootId, productId);
        const availableKg = parseFloat(rootProduct.stock_quantity) - otherReservedKg;
        if (requestedKg > availableKg) {
          const availStr = availableKg <= 0
            ? 'none'
            : availableKg < 1
              ? `${Math.round(availableKg * 1000)} g`
              : `${availableKg.toFixed(3)} kg`;
          throw ApiError.badRequest(`Insufficient stock. Only ${availStr} available.`);
        }
      } else {
        if (product.stock_quantity < quantity) {
          throw ApiError.badRequest(`Insufficient stock. Only ${product.stock_quantity} available.`);
        }
      }
    } else {
      if (product.stock_quantity < quantity) {
        throw ApiError.badRequest(`Insufficient stock. Only ${product.stock_quantity} available.`);
      }
    }
    if (product.max_order_quantity && quantity > product.max_order_quantity) {
      throw ApiError.badRequest(
        `Maximum order quantity is ${product.max_order_quantity}`,
      );
    }
    await Cart.updateItem(userId, productId, quantity);
    return this.getCart(userId, "en", userType);
  }
  static async removeItem(userId, productId, userType = "retail") {
    const result = await Cart.removeItem(userId, productId);
    if (result === 0) {
      throw ApiError.notFound("Item not found in cart");
    }
    return this.getCart(userId, "en", userType);
  }
  static async clearCart(userId) {
    await Cart.clear(userId);
    return { message: "Cart cleared successfully" };
  }
  static async syncPrices(userId, userType = "retail") {
    // Update cart with current prices - important when prices change between add-to-cart and checkout
    let wsPct = 0;
    if (userType === 'wholesale') {
      const setting = await StoreSetting.get('wholesale_discount_pct');
      wsPct = setting ? parseFloat(setting.value) || 0 : 0;
    }
    await Cart.syncPrices(userId, userType, wsPct);
    return this.getCart(userId, "en", userType);
  }
  static async validateForCheckout(userId, userType = "retail") {
    const cart = await this.getCart(userId, "en", userType);
    if (cart.items.length === 0) {
      throw ApiError.badRequest("Cart is empty");
    }
    // Double-check stock availability before allowing checkout (inventory may have changed)
    const validation = await Cart.validateItems(userId);
    if (!validation.valid) {
      throw ApiError.badRequest(
        "Cart has issues that need to be resolved",
        validation.issues,
      );
    }
    // Alert customer if prices changed since they added items
    const priceChanges = cart.items.filter((item) => item.price_changed);
    if (priceChanges.length > 0) {
      let wsPct = 0;
      if (userType === 'wholesale') {
        const setting = await StoreSetting.get('wholesale_discount_pct');
        wsPct = setting ? parseFloat(setting.value) || 0 : 0;
      }
      await Cart.syncPrices(userId, userType, wsPct);
      return {
        valid: true,
        warning:
          "Some item prices have changed. Cart has been updated with current prices.",
        cart: await this.getCart(userId, "en", userType),
      };
    }
    return {
      valid: true,
      cart,
    };
  }
  static async syncAll(userId, items, userType = "retail") {
    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest("Items array is required");
    }
    let wsPct = 0;
    if (userType === 'wholesale') {
      const setting = await StoreSetting.get('wholesale_discount_pct');
      wsPct = setting ? parseFloat(setting.value) || 0 : 0;
    }
    await Cart.replaceAll(userId, items, userType, wsPct);
    return this.getCart(userId, "en", userType);
  }
}
module.exports = CartService;

import api from "../lib/api";

/**
 * Cart API Service
 */
class CartService {
  /**
   * Get user's cart
   * @returns {Promise} Cart with items
   */
  async get() {
    return api.get("/cart");
  }

  /**
   * Add item to cart
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @returns {Promise} Updated cart
   */
  async addItem(productId, quantity = 1) {
    return api.post("/cart/items", { product_id: productId, quantity });
  }

  /**
   * Update cart item quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise} Updated cart
   */
  async updateItem(productId, quantity) {
    return api.put(`/cart/items/${productId}`, { quantity });
  }

  /**
   * Remove item from cart
   * @param {string} productId - Product ID
   * @returns {Promise} Updated cart
   */
  async removeItem(productId) {
    return api.delete(`/cart/items/${productId}`);
  }

  /**
   * Clear entire cart
   * @returns {Promise} Empty cart
   */
  async clear() {
    return api.delete("/cart");
  }

  /**
   * Sync cart prices (update prices to current)
   * @returns {Promise} Updated cart
   */
  async syncPrices() {
    return api.post("/cart/sync-prices");
  }

  /**
   * Replace backend cart entirely with frontend items (pre-checkout sync)
   * @param {Array} items - [{ product_id, quantity }]
   * @returns {Promise} Backend cart after sync
   */
  async syncAll(items) {
    return api.post("/cart/sync-all", { items });
  }
}

export default new CartService();

import api from "../lib/api";
class CartService {
  async get() {
    return api.get("/cart");
  }
  async addItem(productId, quantity = 1) {
    return api.post("/cart/items", { product_id: productId, quantity });
  }
  async updateItem(productId, quantity) {
    return api.put(`/cart/items/${productId}`, { quantity });
  }
  async removeItem(productId) {
    return api.delete(`/cart/items/${productId}`);
  }
  async clear() {
    return api.delete("/cart");
  }
  async syncPrices() {
    return api.post("/cart/sync-prices");
  }
  async syncAll(items) {
    return api.post("/cart/sync-all", { items });
  }
}
export default new CartService();
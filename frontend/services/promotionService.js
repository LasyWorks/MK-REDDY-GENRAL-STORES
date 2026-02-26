import api from "../lib/api";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
class PromotionService {
  async getActive() {
    const res = await fetch(`${API_URL}/promotions/active`);
    if (!res.ok) throw new Error("Failed to fetch active promotions");
    return res.json();
  }
  async getUpcoming(days = 7) {
    const res = await fetch(`${API_URL}/promotions/upcoming?days=${days}`);
    if (!res.ok) throw new Error("Failed to fetch upcoming promotions");
    return res.json();
  }
  async getProductMap() {
    const res = await fetch(`${API_URL}/promotions/product-map`);
    if (!res.ok) throw new Error("Failed to fetch product promo map");
    return res.json();
  }
  async getAll(params = {}) {
    return api.get("/promotions", params);
  }
  async getById(id) {
    return api.get(`/promotions/${id}`);
  }
  async create(data) {
    return api.post("/promotions", data);
  }
  async update(id, data) {
    return api.put(`/promotions/${id}`, data);
  }
  async delete(id) {
    return api.delete(`/promotions/${id}`);
  }
  async toggleActive(id) {
    return api.put(`/promotions/${id}/toggle-active`);
  }
}
export default new PromotionService();
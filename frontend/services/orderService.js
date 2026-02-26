import api from "../lib/api";
class OrderService {
  async getAll(params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    };
    return api.get("/orders/my-orders", queryParams);
  }
  async getById(id) {
    return api.get(`/orders/${id}`);
  }
  async create(orderData = {}) {
    return api.post("/orders", orderData);
  }
  async cancel(id, reason) {
    return api.post(`/orders/${id}/cancel`, { reason });
  }
  async getInvoice(orderId) {
    return api.get(`/invoices/order/${orderId}`);
  }
}
export default new OrderService();
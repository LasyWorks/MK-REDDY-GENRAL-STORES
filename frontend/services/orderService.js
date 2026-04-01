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
  async previewBirthdayCoupon(payload = {}) {
    return api.post("/orders/birthday-coupon/preview", payload);
  }
  async cancel(id, reasonOrPayload) {
    const payload = typeof reasonOrPayload === "string"
      ? { reason: reasonOrPayload }
      : (reasonOrPayload || {});
    return api.post(`/orders/${id}/cancel`, payload);
  }
  async getInvoice(orderId) {
    return api.get(`/invoices/order/${orderId}`);
  }
}

const orderService = new OrderService();
export default orderService;

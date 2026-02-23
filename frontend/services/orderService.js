import api from "../lib/api";

/**
 * Order API Service
 */
class OrderService {
  /**
   * Get user's orders
   * @param {Object} params - Query parameters
   * @returns {Promise} Orders list
   */
  async getAll(params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    };
    return api.get("/orders", queryParams);
  }

  /**
   * Get order by ID
   * @param {string} id - Order ID
   * @returns {Promise} Order details
   */
  async getById(id) {
    return api.get(`/orders/${id}`);
  }

  /**
   * Create order from cart
   * @param {Object} orderData - Order data (notes, etc.)
   * @returns {Promise} Created order
   */
  async create(orderData = {}) {
    return api.post("/orders", orderData);
  }

  /**
   * Cancel order
   * @param {string} id - Order ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise} Updated order
   */
  async cancel(id, reason) {
    return api.post(`/orders/${id}/cancel`, { reason });
  }

  /**
   * Get order invoice
   * @param {string} orderId - Order ID
   * @returns {Promise} Invoice details
   */
  async getInvoice(orderId) {
    return api.get(`/invoices/order/${orderId}`);
  }
}

export default new OrderService();

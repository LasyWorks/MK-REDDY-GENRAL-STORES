import api from "../lib/api";

/**
 * Product API Service
 */
class ProductService {
  /**
   * Get all products
   * @param {Object} params - Query parameters
   * @returns {Promise} Products response
   */
  async getAll(params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      is_active: true,
      ...params,
    };
    return api.get("/products", queryParams);
  }

  /**
   * Get product by ID
   * @param {string} id - Product ID
   * @returns {Promise} Product details
   */
  async getById(id) {
    return api.get(`/products/${id}`);
  }

  /**
   * Search products
   * @param {string} query - Search query
   * @param {Object} params - Additional parameters
   * @returns {Promise} Search results
   */
  async search(query, params = {}) {
    const queryParams = {
      search: query,
      page: params.page || 1,
      limit: params.limit || 20,
      ...params,
    };
    return api.get("/products", queryParams);
  }

  /**
   * Get featured products
   * @param {Object} params - Query parameters
   * @returns {Promise} Featured products
   */
  async getFeatured(params = {}) {
    const queryParams = {
      is_featured: true,
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    };
    return api.get("/products", queryParams);
  }

  /**
   * Get products by category
   * @param {string} categoryId - Category ID
   * @param {Object} params - Query parameters
   * @returns {Promise} Products in category
   */
  async getByCategory(categoryId, params = {}) {
    const queryParams = {
      category_id: categoryId,
      page: params.page || 1,
      limit: params.limit || 20,
      ...params,
    };
    return api.get("/products", queryParams);
  }
}

export default new ProductService();

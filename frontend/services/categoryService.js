import api from "../lib/api";

/**
 * Category API Service
 */
class CategoryService {
  /**
   * Get all categories
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @returns {Promise} Categories response
   */
  async getAll(params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 50,
      is_active: true,
      ...params,
    };
    return api.get("/categories", queryParams);
  }

  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Promise} Category details
   */
  async getById(id) {
    return api.get(`/categories/${id}`);
  }

  /**
   * Get products by category
   * @param {string} id - Category ID
   * @param {Object} params - Query parameters
   * @returns {Promise} Products in category
   */
  async getProducts(id, params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...params,
    };
    return api.get(`/categories/${id}/products`, queryParams);
  }

  /**
   * Get subcategories of a category (by parent_id)
   * @param {string} parentId - Parent category ID
   * @returns {Promise} Subcategories
   */
  async getSubcategories(parentId) {
    return api.get("/categories", {
      parent_id: parentId,
      limit: 100,
      is_active: true,
    });
  }
}

export default new CategoryService();

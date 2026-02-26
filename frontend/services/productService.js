import api from "../lib/api";
class ProductService {
  async getAll(params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      is_active: true,
      ...params,
    };
    return api.get("/products", queryParams);
  }
  async getById(id) {
    return api.get(`/products/${id}`);
  }
  async search(query, params = {}) {
    const queryParams = {
      search: query,
      page: params.page || 1,
      limit: params.limit || 20,
      ...params,
    };
    return api.get("/products", queryParams);
  }
  async getFeatured(params = {}) {
    const queryParams = {
      is_featured: true,
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    };
    return api.get("/products", queryParams);
  }
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
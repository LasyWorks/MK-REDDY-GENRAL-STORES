import api from "../lib/api";
class CategoryService {
  async getAll(params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 50,
      is_active: true,
      ...params,
    };
    return api.get("/categories", queryParams);
  }
  async getById(id) {
    return api.get(`/categories/${id}`);
  }
  async getProducts(id, params = {}) {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      ...params,
    };
    return api.get(`/categories/${id}/products`, queryParams);
  }
  async getSubcategories(parentId) {
    return api.get("/categories", {
      parent_id: parentId,
      limit: 100,
      is_active: true,
    });
  }
}
export default new CategoryService();
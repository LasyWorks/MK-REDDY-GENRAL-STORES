const { CategoryService } = require("../services");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");
const { getPaginationParams } = require("../utils/helpers");
const getCategories = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit, 500);
  const { is_active, search, parent_id, parent_only } = req.query;
  const lang = req.language || "en";
  const result = await CategoryService.getAll({
    page,
    limit,
    isActive: is_active !== undefined ? is_active === "true" : true,
    search,
    lang,
    // parent_id=null in query string means top-level categories only
    parentOnly: parent_only === "true" || parent_id === "null",
    parentId: parent_id && parent_id !== "null" ? parent_id : undefined,
  });
  ApiResponse.paginated(res, result.categories, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getCategory = asyncHandler(async (req, res) => {
  const lang = req.language || "en";
  const category = await CategoryService.getById(req.params.id, lang);
  ApiResponse.success(res, category);
});
const createCategory = asyncHandler(async (req, res) => {
  const category = await CategoryService.create(req.body, req.user.id);
  ApiResponse.created(res, category, "Category created successfully");
});
const updateCategory = asyncHandler(async (req, res) => {
  const category = await CategoryService.update(
    req.params.id,
    req.body,
    req.user.id,
  );
  ApiResponse.success(res, category, "Category updated successfully");
});
const deleteCategory = asyncHandler(async (req, res) => {
  await CategoryService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, "Category deleted successfully");
});
const toggleActive = asyncHandler(async (req, res) => {
  const result = await CategoryService.toggleActive(req.params.id, req.user.id);
  ApiResponse.success(res, result);
});
const getCategoryProducts = asyncHandler(async (req, res) => {
  const { ProductService } = require("../services");
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit, 500);
  const lang = req.language || "en";
  const userType = req.user?.user_type || "retail";
  const result = await ProductService.getByCategory(req.params.id, {
    page,
    limit,
    lang,
    userType,
  });
  ApiResponse.paginated(res, result.products, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit, 500);
  const lang = req.language || "en";
  const result = await CategoryService.getAll({
    page,
    limit,
    isActive: null,
    lang,
  });
  ApiResponse.paginated(res, result.categories, {
    page,
    limit,
    totalItems: result.total,
  });
});
module.exports = {
  getAllCategories: getCategories,
  getCategoryById: getCategory,
  getCategoryProducts,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleActive,
};

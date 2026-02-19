const { CategoryService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');

/**
 * @desc    Get all categories
 * @route   GET /api/v1/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { is_active, search } = req.query;
  const lang = req.language || 'en';

  const result = await CategoryService.getAll({
    page,
    limit,
    isActive: is_active !== undefined ? is_active === 'true' : true,
    search,
    lang,
  });

  ApiResponse.paginated(res, result.categories, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Get category by ID
 * @route   GET /api/v1/categories/:id
 * @access  Public
 */
const getCategory = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const category = await CategoryService.getById(req.params.id, lang);
  ApiResponse.success(res, category);
});

/**
 * @desc    Create category
 * @route   POST /api/v1/categories
 * @access  Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const category = await CategoryService.create(req.body, req.user.id);
  ApiResponse.created(res, category, 'Category created successfully');
});

/**
 * @desc    Update category
 * @route   PUT /api/v1/categories/:id
 * @access  Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await CategoryService.update(req.params.id, req.body, req.user.id);
  ApiResponse.success(res, category, 'Category updated successfully');
});

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/categories/:id
 * @access  Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  await CategoryService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, 'Category deleted successfully');
});

/**
 * @desc    Toggle category active status
 * @route   POST /api/v1/categories/:id/toggle-active
 * @access  Admin
 */
const toggleActive = asyncHandler(async (req, res) => {
  const result = await CategoryService.toggleActive(req.params.id, req.user.id);
  ApiResponse.success(res, result);
});

/**
 * @desc    Get products by category
 * @route   GET /api/v1/categories/:id/products
 * @access  Public
 */
const getCategoryProducts = asyncHandler(async (req, res) => {
  const { ProductService } = require('../services');
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const lang = req.language || 'en';
  const userType = req.user?.user_type || 'retail';

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

/**
 * @desc    Get all categories including inactive (admin)
 * @route   GET /api/v1/categories/admin/all
 * @access  Admin
 */
const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const lang = req.language || 'en';

  const result = await CategoryService.getAll({
    page,
    limit,
    isActive: null, // Get all including inactive
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

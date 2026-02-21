const { ProductService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');

/**
 * @desc    Get all products
 * @route   GET /api/v1/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { category_id, is_active, is_featured, search, min_price, max_price, in_stock, sort_by, sort_order } = req.query;
  const lang = req.language || 'en';

  const result = await ProductService.getAll({
    page,
    limit,
    categoryId: category_id,
    isActive: is_active !== undefined ? is_active === 'true' : true,
    isFeatured: is_featured !== undefined ? is_featured === 'true' : null,
    search,
    minPrice: min_price ? parseFloat(min_price) : null,
    maxPrice: max_price ? parseFloat(max_price) : null,
    inStock: in_stock === 'true',
    sortBy: sort_by,
    sortOrder: sort_order,
    lang,
  });

  ApiResponse.paginated(res, result.products, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Get product by ID
 * @route   GET /api/v1/products/:id
 * @access  Public
 */
const getProduct = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const product = await ProductService.getById(req.params.id, lang);
  ApiResponse.success(res, product);
});

/**
 * @desc    Create product
 * @route   POST /api/v1/products
 * @access  Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body, req.user.id);
  ApiResponse.created(res, product, 'Product created successfully');
});

/**
 * @desc    Update product
 * @route   PUT /api/v1/products/:id
 * @access  Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.update(req.params.id, req.body, req.user.id);
  ApiResponse.success(res, product, 'Product updated successfully');
});

/**
 * @desc    Delete product
 * @route   DELETE /api/v1/products/:id
 * @access  Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  await ProductService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, 'Product deleted successfully');
});

/**
 * @desc    Update product stock
 * @route   PATCH /api/v1/products/:id/stock
 * @access  Admin
 */
const updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body;
  const result = await ProductService.updateStock(req.params.id, quantity, req.user.id, operation || 'add');
  ApiResponse.success(res, result, 'Stock updated successfully');
});

/**
 * @desc    Bulk upload products
 * @route   POST /api/v1/products/bulk-upload
 * @access  Admin
 */
const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'Please upload an Excel file', 400);
  }

  const result = await ProductService.bulkUpload(req.file.path, req.user.id);
  ApiResponse.success(res, result, 'Bulk upload completed');
});

/**
 * @desc    Get product count
 * @route   GET /api/v1/products/count
 * @access  Admin
 */
const getProductCount = asyncHandler(async (req, res) => {
  const result = await ProductService.getCount();
  ApiResponse.success(res, result);
});

/**
 * @desc    Search products
 * @route   GET /api/v1/products/search
 * @access  Public
 */
const searchProducts = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const { page: pg, limit: lmt } = getPaginationParams(page, limit);
  const lang = req.language || 'en';

  const result = await ProductService.search(q, {
    page: pg,
    limit: lmt,
    lang,
  });

  ApiResponse.paginated(res, result.products, {
    page: pg,
    limit: lmt,
    totalItems: result.total,
  });
});

/**
 * @desc    Get all products including inactive (admin)
 * @route   GET /api/v1/products/admin/all
 * @access  Admin
 */
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { category_id } = req.query;
  const lang = req.language || 'en';

  const result = await ProductService.getAll({
    page,
    limit,
    categoryId: category_id,
    isActive: null, // Get all
    lang,
  });

  ApiResponse.paginated(res, result.products, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Get low stock products
 * @route   GET /api/v1/products/admin/low-stock
 * @access  Admin
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold } = req.query;
  const result = await ProductService.getLowStock(parseInt(threshold) || 15);
  ApiResponse.success(res, result);
});

/**
 * @desc    Toggle product active status
 * @route   PUT /api/v1/products/:id/toggle-active
 * @access  Admin
 */
const toggleActive = asyncHandler(async (req, res) => {
  const product = await ProductService.toggleActive(req.params.id, req.user.id);
  ApiResponse.success(res, product, 'Product status updated');
});

/**
 * @desc    Download bulk upload template
 * @route   GET /api/v1/products/template/download
 * @access  Admin
 */
const downloadTemplate = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="product-template.xlsx"');
  
  // Simple template structure
  const template = {
    headers: ['sku', 'name_en', 'name_te', 'category_id', 'unit_type', 'price', 'wholesale_price', 'gst_percentage', 'stock_quantity', 'description_en', 'description_te'],
  };
  
  ApiResponse.success(res, template, 'Template structure - use Excel to create file with these columns');
});

module.exports = {
  getAllProducts: getProducts,
  getProductById: getProduct,
  searchProducts,
  getAllProductsAdmin,
  getLowStockProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  toggleActive,
  bulkUpload,
  downloadTemplate,
  getProductCount,
};

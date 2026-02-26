const { ProductService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const getProducts = asyncHandler(async (req, res) => {
  // Protect against loading too many products at once to prevent server overload
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { category_id, parent_category_id, is_active, is_featured, search, min_price, max_price, in_stock, sort_by, sort_order, brand, has_discount, id } = req.query;
  
  // Show product names in customer's language for better user experience
  const lang = req.language || 'en';
  
  // Allow fetching multiple specific products by ID for cart/wishlist loading
  let ids = null;
  if (id) {
    ids = Array.isArray(id) ? id : [id];
  }
  const result = await ProductService.getAll({
    page,
    limit,
    ids,
    categoryId: category_id,
    parentCategoryId: parent_category_id || null,
    // Only show active products to customers by default, unless specifically requested
    isActive: is_active !== undefined ? is_active === 'true' : true,
    isFeatured: is_featured !== undefined ? is_featured === 'true' : null,
    search,
    minPrice: min_price ? parseFloat(min_price) : null,
    maxPrice: max_price ? parseFloat(max_price) : null,
    inStock: in_stock === 'true',
    hasDiscount: has_discount === 'true' ? true : null,
    sortBy: sort_by,
    sortOrder: sort_order,
    brand: brand || null,
    lang,
  });
  ApiResponse.paginated(res, result.products, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getProduct = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const product = await ProductService.getById(req.params.id, lang);
  ApiResponse.success(res, product);
});
const createProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body, req.user.id);
  ApiResponse.created(res, product, 'Product created successfully');
});
const updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.update(req.params.id, req.body, req.user.id);
  ApiResponse.success(res, product, 'Product updated successfully');
});
const deleteProduct = asyncHandler(async (req, res) => {
  await ProductService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, 'Product deleted successfully');
});
const updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body;
  const result = await ProductService.updateStock(req.params.id, quantity, req.user.id, operation || 'add');
  ApiResponse.success(res, result, 'Stock updated successfully');
});
const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'Please upload an Excel file', 400);
  }
  const result = await ProductService.bulkUpload(req.file.path, req.user.id);
  ApiResponse.success(res, result, 'Bulk upload completed');
});
const getProductCount = asyncHandler(async (req, res) => {
  const result = await ProductService.getCount();
  ApiResponse.success(res, result);
});
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
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  // Allow admins to see more products per page since they're managing inventory
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit, 1000);
  const { category_id } = req.query;
  const lang = req.language || 'en';
  const result = await ProductService.getAll({
    page,
    limit,
    categoryId: category_id,
    // Show both active and inactive products so admins can manage everything
    isActive: null, 
    lang,
  });
  ApiResponse.paginated(res, result.products, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold } = req.query;
  const result = await ProductService.getLowStock(parseInt(threshold) || 15);
  ApiResponse.success(res, result);
});
const toggleActive = asyncHandler(async (req, res) => {
  const product = await ProductService.toggleActive(req.params.id, req.user.id);
  ApiResponse.success(res, product, 'Product status updated');
});
const downloadTemplate = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="product-template.xlsx"');
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

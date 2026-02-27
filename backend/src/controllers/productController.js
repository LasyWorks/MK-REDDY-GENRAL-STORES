const { ProductService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const ExcelJS = require('exceljs');
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
  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');
  
  // Define columns with headers and example data
  worksheet.columns = [
    { header: 'sku', key: 'sku', width: 15 },
    { header: 'name_en', key: 'name_en', width: 30 },
    { header: 'name_te', key: 'name_te', width: 30 },
    { header: 'category_id', key: 'category_id', width: 40 },
    { header: 'unit_type', key: 'unit_type', width: 12 },
    { header: 'price', key: 'price', width: 10 },
    { header: 'wholesale_price', key: 'wholesale_price', width: 15 },
    { header: 'gst_percentage', key: 'gst_percentage', width: 15 },
    { header: 'stock_quantity', key: 'stock_quantity', width: 15 },
    { header: 'description_en', key: 'description_en', width: 40 },
    { header: 'description_te', key: 'description_te', width: 40 }
  ];
  
  // Add example row with sample data
  worksheet.addRow({
    sku: 'SAMPLE-001',
    name_en: 'Sample Product',
    name_te: 'నమూనా ఉత్పత్తి',
    category_id: 'Enter category UUID',
    unit_type: 'kg',
    price: 100.00,
    wholesale_price: 90.00,
    gst_percentage: 18,
    stock_quantity: 50,
    description_en: 'Sample description',
    description_te: 'నమూనా వివరణ'
  });
  
  // Add notes row
  worksheet.addRow({
    sku: 'Note: Valid unit_types are: kg, piece, case, litre, gram, pack',
    name_en: 'Required field',
    name_te: 'Optional',
    category_id: 'Required - must be valid UUID',
    unit_type: 'Required',
    price: 'Required - positive number',
    wholesale_price: 'Optional',
    gst_percentage: 'Optional - defaults to 18',
    stock_quantity: 'Optional - defaults to 0',
    description_en: 'Optional',
    description_te: 'Optional'
  });
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // Style the notes row
  worksheet.getRow(3).font = { italic: true, size: 9 };
  worksheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEFD5' }
  };
  
  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="product-template.xlsx"');
  
  // Write workbook to response
  await workbook.xlsx.write(res);
  res.end();
});

const getFrequentlyBoughtTogether = asyncHandler(async (req, res) => {
  const lang = req.language || 'en';
  const limit = req.query.limit ? parseInt(req.query.limit) : 12;
  
  const products = await ProductService.getFrequentlyBoughtTogether(req.params.id, {
    lang,
    limit,
  });
  
  ApiResponse.success(res, products);
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
  getFrequentlyBoughtTogether,
};

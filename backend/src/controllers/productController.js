const { ProductService } = require("../services");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");
const { getPaginationParams } = require("../utils/helpers");
const ExcelJS = require("exceljs");
const getProducts = asyncHandler(async (req, res) => {
  // Protect against loading too many products at once to prevent server overload
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const {
    category_id,
    parent_category_id,
    is_active,
    is_featured,
    search,
    min_price,
    max_price,
    in_stock,
    sort_by,
    sort_order,
    brand,
    has_discount,
    id,
    parent_product_id,
    exclude_variants,
  } = req.query;

  // Show product names in customer's language for better user experience
  const lang = req.language || "en";

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
    isActive: is_active !== undefined ? is_active === "true" : true,
    isFeatured: is_featured !== undefined ? is_featured === "true" : null,
    search,
    minPrice: min_price ? parseFloat(min_price) : null,
    maxPrice: max_price ? parseFloat(max_price) : null,
    inStock: in_stock === "true",
    hasDiscount: has_discount === "true" ? true : null,
    sortBy: sort_by,
    sortOrder: sort_order,
    brand: brand || null,
    lang,
    // Variant support
    parentProductId: parent_product_id || null,
    excludeVariants: exclude_variants === "true",
  });
  ApiResponse.paginated(res, result.products, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getProduct = asyncHandler(async (req, res) => {
  const lang = req.language || "en";
  const product = await ProductService.getById(req.params.id, lang);
  ApiResponse.success(res, product);
});
const createProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body, req.user.id);
  ApiResponse.created(res, product, "Product created successfully");
});
const updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.update(
    req.params.id,
    req.body,
    req.user.id,
  );
  ApiResponse.success(res, product, "Product updated successfully");
});
const deleteProduct = asyncHandler(async (req, res) => {
  await ProductService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, "Product deleted successfully");
});
const updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body;
  const result = await ProductService.updateStock(
    req.params.id,
    quantity,
    req.user.id,
    operation || "add",
  );
  ApiResponse.success(res, result, "Stock updated successfully");
});
const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, "Please upload an Excel file", 400);
  }
  const result = await ProductService.bulkUpload(req.file.path, req.user.id);
  ApiResponse.success(res, result, "Bulk upload completed");
});
const getProductCount = asyncHandler(async (req, res) => {
  const result = await ProductService.getCount();
  ApiResponse.success(res, result);
});
const searchProducts = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const { page: pg, limit: lmt } = getPaginationParams(page, limit);
  const lang = req.language || "en";
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
  const { page, limit } = getPaginationParams(
    req.query.page,
    req.query.limit,
    1000,
  );
  const { category_id, search, sort_by, sort_order } = req.query;
  const lang = req.language || "en";
  const result = await ProductService.getAll({
    page,
    limit,
    categoryId: category_id,
    search: search || null,
    sortBy: sort_by || "name",
    sortOrder: sort_order || "ASC",
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
  ApiResponse.success(res, product, "Product status updated");
});
const downloadTemplate = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Stock Update");

  ws.columns = [
    { header: "name_en",        key: "name_en",        width: 35 },
    { header: "unit_pack_size", key: "unit_pack_size", width: 14 },
    { header: "stock_quantity", key: "stock_quantity", width: 14 },
    { header: "price",          key: "price",          width: 10 },
    { header: "mrp",            key: "mrp",            width: 10 },
    { header: "wholesale_price",key: "wholesale_price", width: 16 },
  ];

  // Style header – green background, white bold
  const hRow = ws.getRow(1);
  hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF388E3C" } };
  hRow.height = 20;

  // Example row
  ws.addRow({
    name_en: "Sample Product",
    unit_pack_size: "1 kg",
    stock_quantity: 50,
    price: 100.0,
    mrp: 120.0,
    wholesale_price: 90.0,
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="stock-update-template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const downloadAllProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getAll({
    limit: 10000,
    page: 1,
    isActive: null,
    lang: "en",
    sortBy: "name",
    sortOrder: "ASC",
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MK Reddy General Stores";
  const ws = workbook.addWorksheet("Products");

  ws.columns = [
    { header: "name_en",        key: "name_en",        width: 35 },
    { header: "unit_pack_size", key: "unit_pack_size", width: 14 },
    { header: "stock_quantity", key: "stock_quantity", width: 14 },
    { header: "price",          key: "price",          width: 10 },
    { header: "mrp",            key: "mrp",            width: 10 },
    { header: "wholesale_price",key: "wholesale_price", width: 16 },
  ];

  // Style header row – green background, white bold text
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF388E3C" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  for (const p of result.products) {
    ws.addRow({
      name_en:        p.name_en || p.name || "",
      unit_pack_size: p.unit_pack_size || "",
      stock_quantity: p.stock_quantity,
      price:          p.price,
      mrp:            p.mrp != null ? p.mrp : "",
      wholesale_price:p.wholesale_price != null ? p.wholesale_price : "",
    });
  }

  // Freeze first row for easy scrolling
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const filename = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  await workbook.xlsx.write(res);
  res.end();
});

const getFrequentlyBoughtTogether = asyncHandler(async (req, res) => {
  const lang = req.language || "en";
  const limit = req.query.limit ? parseInt(req.query.limit) : 12;

  const products = await ProductService.getFrequentlyBoughtTogether(
    req.params.id,
    {
      lang,
      limit,
    },
  );

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
  downloadAllProducts,
  getProductCount,
  getFrequentlyBoughtTogether,
};

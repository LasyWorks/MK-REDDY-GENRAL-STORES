const { ProductService } = require("../services");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");
const { getPaginationParams } = require("../utils/helpers");
const ExcelJS = require("exceljs");
const { query, modify } = require("../config/database");
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

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, "Please upload an image file", 400);
  }
  const appConfig = require("../config");
  const backendBase =
    process.env.BACKEND_URL ||
    `http://localhost:${appConfig.port}`;
  const imageUrl = `${backendBase}/uploads/${req.file.filename}`;
  ApiResponse.success(res, { url: imageUrl }, "Image uploaded");
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
  const { category_id, search, sort_by, sort_order, exclude_variants } = req.query;
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
    // Optional: exclude child variants to show only parent products
    excludeVariants: exclude_variants === "true",
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
    { header: "name_en", key: "name_en", width: 35 },
    { header: "unit_pack_size", key: "unit_pack_size", width: 14 },
    { header: "stock_quantity", key: "stock_quantity", width: 14 },
    { header: "price", key: "price", width: 10 },
    { header: "mrp", key: "mrp", width: 10 },
    { header: "wholesale_price", key: "wholesale_price", width: 16 },
  ];

  // Style header – green background, white bold
  const hRow = ws.getRow(1);
  hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF388E3C" },
  };
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

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="stock-update-template.xlsx"',
  );
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

  // Optional: filter to specific IDs when ?ids=uuid1,uuid2,... is provided
  const idsParam = req.query.ids;
  const filterIds = idsParam ? new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean)) : null;
  if (filterIds && filterIds.size > 0) {
    result.products = result.products.filter((p) => filterIds.has(String(p.id)));
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MK Reddy General Stores";
  const ws = workbook.addWorksheet("Products");

  ws.columns = [
    { header: "name_en", key: "name_en", width: 35 },
    { header: "unit_pack_size", key: "unit_pack_size", width: 14 },
    { header: "stock_quantity", key: "stock_quantity", width: 14 },
    { header: "low_stock_threshold", key: "low_stock_threshold", width: 20 },
    { header: "price", key: "price", width: 10 },
    { header: "mrp", key: "mrp", width: 10 },
    { header: "wholesale_price", key: "wholesale_price", width: 16 },
  ];

  // Style header row – green background, white bold text
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF388E3C" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  for (const p of result.products) {
    ws.addRow({
      name_en: p.name_en || p.name || "",
      unit_pack_size: p.unit_pack_size || "",
      stock_quantity: p.stock_quantity,
      low_stock_threshold: p.low_stock_threshold ?? 10,
      price: p.price,
      mrp: p.mrp != null ? p.mrp : "",
      wholesale_price: p.wholesale_price != null ? p.wholesale_price : "",
    });
  }

  // Freeze first row for easy scrolling
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const filename = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
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

// ── Seeded LCG shuffle — same seed → same order every day ──────────────────
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Daily featured: seeded-shuffle of featured/active products, changes every day ──
const getDailyFeatured = asyncHandler(async (req, res) => {
  const lang = req.language || "en";
  const limit = Math.min(parseInt(req.query.limit) || 20, 40);

  // Prefer is_featured products
  let { products } = await ProductService.getAll({
    isActive: true,
    isFeatured: true,
    limit: 200,
    page: 1,
    lang,
    inStock: true,
  });

  // If fewer than 8 featured, supplement with recently-added active products
  if (products.length < 8) {
    const { products: extra } = await ProductService.getAll({
      isActive: true,
      limit: 200,
      page: 1,
      lang,
      inStock: true,
      sortBy: "created_at",
      sortOrder: "DESC",
    });
    const seen = new Set(products.map((p) => p.id));
    for (const p of extra) if (!seen.has(p.id)) products.push(p);
  }

  // Seed = today's YYYYMMDD integer → same shuffle all day, new shuffle tomorrow
  const now = new Date();
  const seed =
    (now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()) >>>
    0;

  const daily = seededShuffle(products, seed).slice(0, limit);
  ApiResponse.paginated(res, daily, {
    page: 1,
    limit,
    totalItems: daily.length,
  });
});

/**
 * GET /products/gst-summary
 * Returns all categories with product count and GST rate breakdown.
 */
const getGSTSummary = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT
       c.id            AS category_id,
       c.parent_id,
       t_en.name       AS category_name,
       p.gst_percentage,
       COUNT(p.id)     AS product_count
     FROM categories c
     LEFT JOIN category_translations t_en ON c.id = t_en.category_id AND t_en.lang_code = 'en'
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id, c.parent_id, t_en.name, p.gst_percentage
     ORDER BY c.parent_id NULLS FIRST, t_en.name, p.gst_percentage`,
    [],
  );

  // Build a map: category_id -> { category_id, parent_id, category_name, rates: [{gst, count}], total }
  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.category_id]) {
      catMap[r.category_id] = {
        category_id: r.category_id,
        parent_id: r.parent_id,
        category_name: r.category_name || "Unnamed",
        rates: [],
        total: 0,
      };
    }
    if (r.gst_percentage !== null && parseInt(r.product_count) > 0) {
      catMap[r.category_id].rates.push({
        gst: parseFloat(r.gst_percentage),
        count: parseInt(r.product_count),
      });
      catMap[r.category_id].total += parseInt(r.product_count);
    }
  }

  ApiResponse.success(res, Object.values(catMap));
});

/**
 * PUT /products/bulk-gst
 * Body: { category_id, gst_percentage, include_subcategories }
 * Bulk-updates gst_percentage on all products of the given category.
 */
const bulkUpdateGSTByCategory = asyncHandler(async (req, res) => {
  const { category_id, gst_percentage, include_subcategories } = req.body;

  if (!category_id) {
    return ApiResponse.error(res, "category_id is required", 400);
  }
  const rate = parseFloat(gst_percentage);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return ApiResponse.error(res, "gst_percentage must be between 0 and 100", 400);
  }

  let updated;
  if (include_subcategories) {
    // Update products in this category AND all its subcategories
    updated = await modify(
      `UPDATE products
       SET gst_percentage = $1, updated_at = NOW()
       WHERE category_id = $2
          OR category_id IN (SELECT id FROM categories WHERE parent_id = $2)`,
      [rate, category_id],
    );
  } else {
    updated = await modify(
      `UPDATE products
       SET gst_percentage = $1, updated_at = NOW()
       WHERE category_id = $2`,
      [rate, category_id],
    );
  }

  ApiResponse.success(res, { updated }, `GST updated to ${rate}% for ${updated} products`);
});

// GET /products/popular — top products by order frequency (public, no auth)
const getPopularProducts = asyncHandler(async (req, res) => {
  const lang = req.language || "en";
  const limit = Math.min(parseInt(req.query.limit) || 20, 40);
  const days = Math.min(parseInt(req.query.days) || 90, 365);

  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const rows = await query(
    `SELECT
       p.id, p.sku, p.image_url, p.price, p.mrp, p.wholesale_price,
       p.stock_quantity, p.unit_pack_size, p.is_active, p.is_featured,
       p.gst_percentage, p.created_at, p.category_id,
       COALESCE(pt.name, pt_en.name, p.sku) AS name,
       COALESCE(pt.description, pt_en.description) AS description,
       SUM(oi.quantity) AS total_quantity,
       COUNT(DISTINCT oi.order_id) AS order_count
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     LEFT JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = $1
     LEFT JOIN product_translations pt_en ON p.id = pt_en.product_id AND pt_en.lang_code = 'en'
     JOIN orders o ON oi.order_id = o.id
     WHERE o.status = 'picked_up'
       AND o.created_at >= $2::date
       AND p.is_active = true
     GROUP BY p.id, pt.name, pt.description, pt_en.name, pt_en.description
     ORDER BY total_quantity DESC, order_count DESC
     LIMIT $3`,
    [lang, cutoff, limit],
  );

  // If not enough order data, supplement with featured/active products
  if (rows.length < 8) {
    const { products: extra } = await ProductService.getAll({
      isActive: true,
      isFeatured: true,
      limit: limit - rows.length,
      page: 1,
      lang,
      inStock: true,
    });
    const seen = new Set(rows.map((r) => r.id));
    for (const p of extra) {
      if (!seen.has(p.id)) rows.push(p);
    }
  }

  ApiResponse.paginated(res, rows.slice(0, limit), {
    page: 1,
    limit,
    totalItems: rows.length,
  });
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
  uploadProductImage,
  downloadTemplate,
  downloadAllProducts,
  getProductCount,
  getFrequentlyBoughtTogether,
  getDailyFeatured,
  getPopularProducts,
  getGSTSummary,
  bulkUpdateGSTByCategory,
};

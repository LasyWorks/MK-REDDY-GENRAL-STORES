const { Product, Category, AdminLog } = require("../models");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const { revalidatePages } = require("../utils/revalidate");
const { invalidateCache } = require("../middlewares/cache");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
class ProductService {
  static async getById(id, lang = "en") {
    // Validate UUID format before hitting the DB to avoid PostgreSQL 22P02 errors
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !UUID_RE.test(id)) {
      throw ApiError.notFound("Product not found");
    }
    const product = await Product.findById(id, lang);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    return product;
  }
  static async getAll(options = {}) {
    return Product.findAll(options);
  }
  static async getByCategory(categoryId, options = {}) {
    return Product.findAll({
      ...options,
      categoryId: categoryId,
      isActive: true,
    });
  }
  static async create(productData, adminId) {
    // Enforce catalog size limit to prevent database bloat and performance issues
    const productCount = await Product.count();
    if (productCount >= config.limits.maxProducts) {
      throw ApiError.forbidden(
        `Maximum product limit (${config.limits.maxProducts}) reached`,
      );
    }
    const category = await Category.findById(productData.category_id);
    if (!category) {
      throw ApiError.badRequest("Invalid category");
    }
    if (!productData.sku) {
      // Auto-generate SKU if admin doesn't provide one (prevents duplicate entry errors)
      productData.sku = generateSku(productData);
    }
    // SKU must be unique across all products for inventory tracking and order management
    const existingSku = await Product.findBySku(productData.sku);
    if (existingSku) {
      throw ApiError.conflict(
        `SKU '${productData.sku}' already exists. Please use a unique SKU.`,
      );
    }
    const productId = await Product.create(productData);
    await AdminLog.create({
      adminId,
      action: "CREATE_PRODUCT",
      entityType: "product",
      entityId: productId,
      newValue: productData,
    });
    // Invalidate product cache so new product appears in API responses
    invalidateCache("products", "/api/v1/products");
    invalidateCache("responses", "/api/v1/products");
    // Flush category cache so product_count increments immediately
    invalidateCache("categories");

    // Trigger frontend cache refresh so new product appears immediately on website
    await revalidatePages({
      tags: ["products", `category-${productData.category_id}`],
      paths: [`/categories/${productData.category_id}`],
    });
    return this.getById(productId);
  }
  static async update(id, productData, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    // Validate category_id changes - ensure category exists and is active
    if (productData.category_id) {
      const category = await Category.findById(productData.category_id);
      if (!category) {
        throw ApiError.badRequest("Invalid category");
      }
      // Optionally warn if assigning to inactive category
      if (!category.is_active) {
        console.warn(
          `Product ${id} assigned to inactive category ${productData.category_id}`,
        );
      }
    }
    // Validate SKU changes - must remain unique
    if (productData.sku && productData.sku !== product.sku) {
      const existingSku = await Product.findBySku(productData.sku);
      if (existingSku && existingSku.id !== id) {
        throw ApiError.conflict(
          `SKU '${productData.sku}' already exists. Please use a unique SKU.`,
        );
      }
    }
    const oldData = { ...product };
    await Product.update(id, productData);
    await AdminLog.create({
      adminId,
      action: "UPDATE_PRODUCT",
      entityType: "product",
      entityId: id,
      oldValue: oldData,
      newValue: productData,
    });
    const categoryId = productData.category_id || oldData.category_id;
    const oldCategoryId = oldData.category_id;

    // Invalidate caches for updated product and its category
    invalidateCache("products", `/api/v1/products/${id}`);
    invalidateCache("products", "/api/v1/products");
    invalidateCache("responses", "/api/v1/products");
    // Always flush category cache so product_count is up-to-date
    // (covers same-category edits and moves to a different category)
    invalidateCache("categories");

    await revalidatePages({
      tags: [
        "products",
        `product-${id}`,
        `category-${categoryId}`,
        "categories",
      ],
      paths: [
        `/categories/${categoryId}`,
        ...(oldCategoryId !== categoryId
          ? [`/categories/${oldCategoryId}`]
          : []),
      ],
    });
    return this.getById(id);
  }
  static async delete(id, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    // Soft delete: keep product in database for order history, just hide from customers
    await Product.update(id, { is_active: false });

    // Invalidate product caches
    invalidateCache("products", `/api/v1/products/${id}`);
    invalidateCache("products", "/api/v1/products");
    invalidateCache("responses", "/api/v1/products");
    // Flush category cache so the deactivated product doesn't count toward product_count
    invalidateCache("categories");

    await AdminLog.create({
      adminId,
      action: "DEACTIVATE_PRODUCT",
      entityType: "product",
      entityId: id,
      oldValue: { is_active: product.is_active },
      newValue: { is_active: false },
    });
    await revalidatePages({
      tags: [
        "products",
        `product-${id}`,
        `category-${product.category_id}`,
        "categories",
      ],
      paths: [`/categories/${product.category_id}`],
    });
    return { message: "Product deactivated successfully" };
  }
  static async updateStock(id, quantity, adminId, operation = "add") {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    let newStock;
    if (operation === "set") {
      newStock = parseInt(quantity);
    } else {
      newStock = product.stock_quantity + quantity;
    }
    if (newStock < 0) {
      throw ApiError.badRequest("Insufficient stock");
    }
    await Product.update(id, { stock_quantity: newStock });
    await AdminLog.create({
      adminId,
      action: "UPDATE_STOCK",
      entityType: "product",
      entityId: id,
      oldValue: { stock_quantity: product.stock_quantity },
      newValue: { stock_quantity: newStock, change: quantity },
    });
    return {
      product_id: id,
      previous_stock: product.stock_quantity,
      new_stock: newStock,
    };
  }
  static async bulkUpload(filePath, adminId) {
    const { query: dbQuery } = require("../config/database");

    // 1. Read Excel file (sync in-memory, no per-row I/O)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw ApiError.badRequest("Excel file has no worksheets");

    const headers = [];
    const data = [];
    worksheet.getRow(1).eachCell((cell, col) => { headers[col] = cell.value; });
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      row.eachCell((cell, col) => { const h = headers[col]; if (h) rowData[h] = cell.value; });
      if (Object.keys(rowData).length > 0) data.push(rowData);
    });

    if (data.length === 0) throw ApiError.badRequest("Excel file is empty");

    // 2. Load ALL products into memory in ONE query — build lookup maps
    const allRows = await dbQuery(
      `SELECT p.id, p.unit_pack_size, pt.name AS name_en
       FROM products p
       JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'`,
    );
    // Map: "lower(name)::lower(pack)" -> id  and  "lower(name)" -> id (fallback)
    const byNamePack = new Map();
    const byName = new Map();
    for (const r of allRows) {
      const n = (r.name_en || "").toLowerCase().trim();
      const pk = (r.unit_pack_size || "").toLowerCase().trim();
      const key = pk ? `${n}::${pk}` : n;
      if (pk) byNamePack.set(`${n}::${pk}`, r.id);
      if (!byName.has(n)) byName.set(n, r.id);
    }

    // 3. Validate rows and build update queue — all in memory, zero DB calls
    const updateQueue = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2;
      try {
        const nameRaw = row.name_en ? String(row.name_en).trim() : null;
        const packRaw = row.unit_pack_size ? String(row.unit_pack_size).trim() : null;
        if (!nameRaw) throw new Error("name_en is required");

        const nKey = nameRaw.toLowerCase();
        const pKey = packRaw ? packRaw.toLowerCase() : "";
        const productId = (pKey && byNamePack.get(`${nKey}::${pKey}`)) || byName.get(nKey) || null;

        if (!productId) {
          throw new Error(
            `Product "${nameRaw}"${packRaw ? ` (${packRaw})` : ""} not found — use Add Product to create new products`,
          );
        }

        const updates = {};
        if (row.stock_quantity !== undefined && row.stock_quantity !== "") {
          const qty = parseFloat(row.stock_quantity);
          if (!isNaN(qty) && qty >= 0) updates.stock_quantity = qty;
        }
        if (row.price !== undefined && row.price !== "") {
          const price = parseFloat(row.price);
          if (!isNaN(price) && price > 0) updates.price = price;
        }
        if (row.mrp !== undefined && row.mrp !== "") {
          const mrp = parseFloat(row.mrp);
          if (!isNaN(mrp) && mrp > 0) updates.mrp = mrp;
        }
        if (row.wholesale_price !== undefined && row.wholesale_price !== "") {
          const wp = parseFloat(row.wholesale_price);
          if (!isNaN(wp) && wp > 0) updates.wholesale_price = wp;
        }
        if (row.low_stock_threshold !== undefined && row.low_stock_threshold !== "") {
          const lst = parseInt(row.low_stock_threshold);
          if (!isNaN(lst) && lst >= 0) updates.low_stock_threshold = lst;
        }

        if (Object.keys(updates).length === 0) {
          errors.push({ row: rowIndex, name: nameRaw, error: "No updatable fields found in this row" });
        } else {
          updateQueue.push({ _rowIndex: rowIndex, id: productId, name: nameRaw, updates });
        }
      } catch (error) {
        errors.push({ row: rowIndex, name: row.name_en, error: error.message });
      }
    }

    if (updateQueue.length === 0) {
      fs.unlinkSync(filePath);
      throw ApiError.badRequest("No products could be matched for update", errors);
    }

    // 4. Run all updates concurrently (capped at 10 parallel connections)
    let updatedCount = 0;
    const updateErrors = [];
    const CONCURRENCY = 10;
    for (let i = 0; i < updateQueue.length; i += CONCURRENCY) {
      const batch = updateQueue.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((upd) => Product.update(upd.id, upd.updates)));
      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          updatedCount++;
        } else {
          updateErrors.push({ row: batch[idx]._rowIndex, name: batch[idx].name, error: result.reason?.message || "Update failed" });
        }
      });
    }

    fs.unlinkSync(filePath);
    await AdminLog.create({
      adminId,
      action: "BULK_STOCK_UPDATE",
      entityType: "product",
      newValue: { total: data.length, updated: updatedCount, failed: errors.length + updateErrors.length },
    });
    return {
      message: "Stock update completed",
      total: data.length,
      inserted: 0,
      updated: updatedCount,
      failed: errors.length + updateErrors.length,
      validationErrors: errors,
      updateErrors,
    };
  }
  static async getCount() {
    const count = await Product.count();
    return {
      count,
      limit: config.limits.maxProducts,
      remaining: config.limits.maxProducts - count,
    };
  }
  static async search(query, options = {}) {
    return Product.findAll({
      ...options,
      search: query,
      isActive: true,
    });
  }
  static async getLowStock(threshold = 15) {
    const result = await Product.findAll({
      stockThreshold: threshold,
      isActive: null,
      limit: 500,
      sortBy: "stock_quantity",
      sortOrder: "ASC",
    });
    return {
      products: result.products,
      total: result.total,
      threshold,
    };
  }
  static async toggleActive(id, adminId) {
    const product = await this.getById(id);
    if (!product) throw ApiError.notFound("Product not found");
    const newStatus = !product.is_active;
    await Product.update(id, { is_active: newStatus });
    await AdminLog.create({
      adminId,
      action: newStatus ? "ACTIVATE_PRODUCT" : "DEACTIVATE_PRODUCT",
      entityType: "product",
      entityId: id,
    });
    await revalidatePages({
      tags: ["products", `product-${id}`, `category-${product.category_id}`],
      paths: [`/categories/${product.category_id}`],
    });
    return { ...product, is_active: newStatus };
  }

  /**
   * Get products frequently bought together with the given product
   * Based on order history - finds products that appear in orders with this product
   */
  static async getFrequentlyBoughtTogether(productId, options = {}) {
    const { lang = "en", limit = 12 } = options;

    // Simplified query that matches the product list format
    const query = `
      SELECT 
        p.id,
        p.category_id,
        p.brand,
        p.variant,
        p.unit_type,
        p.unit_pack_size,
        p.hsn_code,
        p.price,
        p.mrp,
        p.wholesale_price,
        p.gst_percentage,
        p.stock_quantity,
        p.min_order_quantity,
        p.max_order_quantity,
        p.image_url,
        p.is_active,
        p.is_featured,
        COALESCE(pt_req.name, pt_en.name) as name,
        COALESCE(pt_req.description, pt_en.description) as description,
        pt_en.name as name_en,
        pt_en.description as description_en,
        COALESCE(ct_req.name, ct_en.name) as category_name,
        c.parent_id as category_parent_id,
        COALESCE(pct_req.name, pct_en.name) as parent_category_name,
        COUNT(DISTINCT oi2.order_id) as purchase_frequency
      FROM order_items oi1
      INNER JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi2.product_id != $1
      INNER JOIN products p ON oi2.product_id = p.id
      LEFT JOIN product_translations pt_req ON p.id = pt_req.product_id AND pt_req.lang_code = $2
      LEFT JOIN product_translations pt_en ON p.id = pt_en.product_id AND pt_en.lang_code = 'en'
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN category_translations ct_req ON c.id = ct_req.category_id AND ct_req.lang_code = $2
      LEFT JOIN category_translations ct_en ON c.id = ct_en.category_id AND ct_en.lang_code = 'en'
      LEFT JOIN categories pc ON c.parent_id = pc.id
      LEFT JOIN category_translations pct_req ON pc.id = pct_req.category_id AND pct_req.lang_code = $2
      LEFT JOIN category_translations pct_en ON pc.id = pct_en.category_id AND pct_en.lang_code = 'en'
      WHERE oi1.product_id = $1 
        AND p.is_active = true 
        AND p.stock_quantity > 0
      GROUP BY 
        p.id, p.category_id, p.brand, p.variant, p.unit_type, p.unit_pack_size,
        p.hsn_code, p.price, p.mrp, p.wholesale_price, p.gst_percentage, 
        p.stock_quantity, p.min_order_quantity, p.max_order_quantity, 
        p.image_url, p.is_active, p.is_featured,
        pt_req.name, pt_req.description, pt_en.name, pt_en.description,
        ct_req.name, ct_en.name, c.parent_id, pct_req.name, pct_en.name
      ORDER BY purchase_frequency DESC, p.id DESC
      LIMIT $3
    `;

    // Use the database query function
    const { query: dbQuery } = require("../config/database");
    const result = await dbQuery(query, [productId, lang, limit]);
    return result || [];
  }
}
module.exports = ProductService;

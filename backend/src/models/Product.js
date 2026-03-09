const {
  query,
  queryOne,
  insert,
  modify,
  withTransaction,
} = require("../config/database");
const { translateProductFields } = require("../utils/translate");
const buildTransJoins = (langParam) => `
  LEFT JOIN product_translations    pt_req  ON p.id  = pt_req.product_id   AND pt_req.lang_code  = ${langParam}
  LEFT JOIN product_translations    pt_en   ON p.id  = pt_en.product_id    AND pt_en.lang_code   = 'en'
  LEFT JOIN category_translations   ct_req  ON c.id  = ct_req.category_id  AND ct_req.lang_code  = ${langParam}
  LEFT JOIN category_translations   ct_en   ON c.id  = ct_en.category_id   AND ct_en.lang_code   = 'en'
  LEFT JOIN categories              pc      ON pc.id = c.parent_id
  LEFT JOIN category_translations   pct_req ON pc.id = pct_req.category_id AND pct_req.lang_code = ${langParam}
  LEFT JOIN category_translations   pct_en  ON pc.id = pct_en.category_id  AND pct_en.lang_code  = 'en'
`;
const PROD_TRANS_COLS = `
  COALESCE(pt_req.name,        pt_en.name)        AS name,
  COALESCE(pt_req.description, pt_en.description) AS description,
  pt_en.name        AS name_en,
  pt_en.description AS description_en,
  COALESCE(ct_req.name, ct_en.name)   AS category_name,
  c.parent_id                         AS category_parent_id,
  COALESCE(pct_req.name, pct_en.name) AS parent_category_name
`;
class Product {
  static async findById(id, lang = "en") {
    const row = await queryOne(
      `SELECT p.*, c.id AS cat_id, ${PROD_TRANS_COLS}
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins("$1")}
       WHERE p.id = $2`,
      [lang, id],
    );
    if (!row) return null;
    // Attach sibling variants so the detail page can render weight-selector buttons
    row.variants = await this.findVariants(row.id, row.parent_product_id, lang);
    return row;
  }

  /**
   * Return all products that belong to the same variant group.
   * The group includes the parent itself plus every child that points to it.
   * @param {string} productId        - the current product uuid
   * @param {string|null} parentId    - parent_product_id value from the product row
   * @param {string} lang
   */
  static async findVariants(productId, parentId, lang = "en") {
    // Determine the root of the variant tree
    const rootId = parentId || productId;
    const rows = await query(
      `SELECT p.*, ${PROD_TRANS_COLS}
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins("$1")}
       WHERE (p.id = $2 OR p.parent_product_id = $2)
         AND p.is_active = TRUE
       ORDER BY p.price ASC`,
      [lang, rootId],
    );
    return rows;
  }
  static async findBySku(sku) {
    return queryOne("SELECT * FROM products WHERE sku = $1", [sku]);
  }
  /**
   * Find a product by its English name and optional pack size.
   * Used by the bulk stock-update upload to match rows without needing UUIDs.
   */
  static async findByNameAndPack(nameEn, unitPackSize = null) {
    if (unitPackSize) {
      const row = await queryOne(
        `SELECT p.* FROM products p
         JOIN product_translations t ON t.product_id = p.id AND t.lang_code = 'en'
         WHERE LOWER(t.name) = LOWER($1) AND LOWER(COALESCE(p.unit_pack_size,'')) = LOWER($2)
         LIMIT 1`,
        [nameEn, unitPackSize],
      );
      if (row) return row;
    }
    // Fallback: match by name only (first hit)
    return queryOne(
      `SELECT p.* FROM products p
       JOIN product_translations t ON t.product_id = p.id AND t.lang_code = 'en'
       WHERE LOWER(t.name) = LOWER($1)
       ORDER BY p.created_at ASC
       LIMIT 1`,
      [nameEn],
    );
  }
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      ids = null,
      categoryId = null,
      parentCategoryId = null,
      isActive = null,
      isFeatured = null,
      search = null,
      minPrice = null,
      maxPrice = null,
      inStock = null,
      stockThreshold = null,
      brand = null,
      hasDiscount = null,
      sortBy = "name",
      sortOrder = "ASC",
      lang = "en",
      // Variant filters
      parentProductId = null,   // fetch all variants of a specific parent
      excludeVariants = false,  // when true: hide child-variant rows in listings
    } = options;
    const offset = (page - 1) * limit;
    const conds = [];
    const params = [lang];
    let idx = 2;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      conds.push(`p.id = ANY($${idx++})`);
      params.push(ids);
    }
    if (categoryId) {
      conds.push(`p.category_id = $${idx++}`);
      params.push(categoryId);
    }
    if (parentCategoryId) {
      // Match products assigned *directly* to the parent category (legacy flat products)
      // OR products assigned to any subcategory whose parent is this category
      conds.push(`(c.parent_id = $${idx} OR p.category_id = $${idx})`);
      params.push(parentCategoryId);
      idx++;
    }
    if (isActive !== null) {
      conds.push(`p.is_active = $${idx++}`);
      params.push(isActive ? true : false);
    }
    if (isFeatured !== null) {
      conds.push(`p.is_featured = $${idx++}`);
      params.push(isFeatured ? true : false);
    }
    if (brand) {
      conds.push(`p.brand ILIKE $${idx++}`);
      params.push(brand);
    }
    if (hasDiscount === true) {
      conds.push("p.mrp IS NOT NULL AND p.mrp > p.price");
    }
    if (search) {
      conds.push(
        `(pt_en.name ILIKE $${idx} OR p.sku ILIKE $${idx + 1} OR p.brand ILIKE $${idx + 2})`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      idx += 3;
    }
    if (minPrice !== null) {
      conds.push(`p.price >= $${idx++}`);
      params.push(minPrice);
    }
    if (maxPrice !== null) {
      conds.push(`p.price <= $${idx++}`);
      params.push(maxPrice);
    }
    if (inStock) {
      conds.push("p.stock_quantity > 0");
    }
    if (stockThreshold !== null) {
      conds.push(`p.stock_quantity <= $${idx++}`);
      params.push(stockThreshold);
    }
    // Variant-group filter: fetch all size variants of one parent product
    if (parentProductId) {
      conds.push(`(p.parent_product_id = $${idx} OR p.id = $${idx})`);
      params.push(parentProductId);
      idx++;
    }
    // Hide child variants from category / search listings so only the
    // parent (or standalone) product appears as a single card.
    if (excludeVariants) {
      conds.push("p.parent_product_id IS NULL");
    }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
    const allowedSort = {
      name: "pt_en.name",
      price: "p.price",
      created_at: "p.created_at",
      stock_quantity: "p.stock_quantity",
      discount: "(p.mrp - p.price)",
      avg_rating: "p.created_at" /* fallback until ratings table exists */,
    };
    const sortCol = allowedSort[sortBy] || "pt_en.name";
    const sortDir = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins("$1")}
       ${where}`,
      params,
    );
    const limitIdx = idx++;
    const offsetIdx = idx++;
    const listParams = [...params, limit, offset];
    const rows = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM products v WHERE v.parent_product_id = p.id) AS variant_count,
              (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.product_id = p.id) AS total_sold,
              ${PROD_TRANS_COLS}
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins("$1")}
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );
    return { products: rows, total: parseInt(countRow.total, 10) };
  }

  /**
   * Enforce price hierarchy: wholesale_price <= price <= mrp.
   * Mutates the data object in-place before DB insert/update.
   */
  static normalizePrices(data) {
    const p = parseFloat(data.price);
    if (isNaN(p) || p <= 0) return;

    // MRP must be >= price
    if (data.mrp != null) {
      const m = parseFloat(data.mrp);
      if (!isNaN(m) && m > 0 && m < p) {
        data.mrp = p;
      }
    }

    // wholesale_price must be <= price
    if (data.wholesale_price != null) {
      const ws = parseFloat(data.wholesale_price);
      if (!isNaN(ws) && ws > p) {
        data.wholesale_price = parseFloat((p * 0.90).toFixed(2));
      }
    }

    // purchase_price must be <= price
    if (data.purchase_price != null) {
      const pp = parseFloat(data.purchase_price);
      if (!isNaN(pp) && pp > p) {
        data.purchase_price = p;
      }
    }
  }

  static async create(data) {
    this.normalizePrices(data);
    const {
      category_id,
      sku,
      name_en,
      name_te,
      description_en,
      description_te,
      brand,
      variant,
      unit_type,
      unit_pack_size,
      hsn_code,
      mrp,
      purchase_price,
      price,
      wholesale_price,
      gst_percentage,
      discount,
      margin,
      stock_quantity,
      low_stock_threshold,
      min_order_quantity,
      max_order_quantity,
      image_url,
      image_urls,
      is_active,
      is_featured,
      parent_product_id,
    } = data;
    const prodId = await insert(
      `INSERT INTO products
         (category_id, sku, brand, variant, unit_type, unit_pack_size, hsn_code,
          mrp, purchase_price, price, wholesale_price, gst_percentage, discount, margin,
          stock_quantity, low_stock_threshold, min_order_quantity, max_order_quantity, image_url, image_urls, is_active, is_featured,
          parent_product_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING id`,
      [
        category_id,
        sku || null,
        brand || null,
        variant || null,
        unit_type || 'pcs',
        unit_pack_size || null,
        hsn_code || null,
        mrp || null,
        purchase_price || null,
        price,
        wholesale_price || null,
        gst_percentage || 18,
        discount || null,
        margin || null,
        stock_quantity ?? 100,
        low_stock_threshold ?? 10,
        min_order_quantity || 1,
        max_order_quantity || null,
        image_url || null,
        image_urls || null,
        is_active !== false,
        is_featured || false,
        parent_product_id || null,
      ],
    );
    await modify(
      `INSERT INTO product_translations (product_id, lang_code, name, description) VALUES ($1,'en',$2,$3)`,
      [prodId, name_en, description_en || null],
    );
    let teluguName = name_te;
    let teluguDesc = description_te;
    if (!teluguName) {
      const translated = await translateProductFields(name_en, description_en);
      teluguName = translated.name_te;
      teluguDesc = teluguDesc || translated.description_te;
    }
    if (teluguName) {
      await modify(
        `INSERT INTO product_translations (product_id, lang_code, name, description) VALUES ($1,'te',$2,$3)`,
        [prodId, teluguName, teluguDesc || null],
      );
    }
    return prodId;
  }
  static async update(id, data) {
    this.normalizePrices(data);
    const base = [
      "category_id",
      "sku",
      "brand",
      "variant",
      "unit_type",
      "unit_pack_size",
      "hsn_code",
      "mrp",
      "purchase_price",
      "price",
      "wholesale_price",
      "gst_percentage",
      "discount",
      "margin",
      "stock_quantity",
      "low_stock_threshold",
      "min_order_quantity",
      "max_order_quantity",
      "image_url",
      "image_urls",
      "is_active",
      "is_featured",
      "parent_product_id",
    ];
    const fields = [];
    const vals = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (base.includes(k) && v !== undefined) {
        fields.push(`${k} = $${idx++}`);
        vals.push(v);
      }
    }
    if (fields.length) {
      vals.push(id);
      await modify(
        `UPDATE products SET ${fields.join(", ")} WHERE id = $${idx}`,
        vals,
      );
    }
    const upsert = async (lang, name, desc) => {
      if (!name) return;
      await modify(
        `INSERT INTO product_translations (product_id, lang_code, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id, lang_code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [id, lang, name, desc || null],
      );
    };
    await upsert("en", data.name_en, data.description_en);
    let teluguName = data.name_te;
    let teluguDesc = data.description_te;
    if (data.name_en && !teluguName) {
      const translated = await translateProductFields(
        data.name_en,
        data.description_en,
      );
      teluguName = translated.name_te;
      teluguDesc = teluguDesc || translated.description_te;
    }
    await upsert("te", teluguName, teluguDesc);
    return this.findById(id);
  }
  static async delete(id) {
    return modify("DELETE FROM products WHERE id = $1", [id]);
  }
  static async updateStock(id, quantity) {
    return modify(
      "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
      [quantity, id],
    );
  }
  static async reduceStock(id, quantity) {
    return modify(
      "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1",
      [quantity, id],
    );
  }
  static async checkStock(id, quantity) {
    const r = await queryOne(
      "SELECT stock_quantity FROM products WHERE id = $1 AND is_active = TRUE",
      [id],
    );
    return r && r.stock_quantity >= quantity;
  }
  static async count() {
    const r = await queryOne("SELECT COUNT(*) AS count FROM products");
    return parseInt(r.count, 10);
  }
  static async bulkInsert(products) {
    return withTransaction(async (client) => {
      const results = { success: 0, failed: 0, errors: [] };
      for (const product of products) {
        try {
          const r = await client.query(
            `INSERT INTO products (category_id, sku, brand, variant, unit_type, unit_pack_size, hsn_code,
             mrp, purchase_price, price, gst_percentage, discount, margin, stock_quantity, image_url, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE) RETURNING id`,
            [
              product.category_id,
              product.sku,
              product.brand || null,
              product.variant || null,
              product.unit_type || null,
              product.unit_pack_size || null,
              product.hsn_code || null,
              product.mrp || null,
              product.purchase_price || null,
              product.price,
              product.gst_percentage || 18,
              product.discount || null,
              product.margin || null,
              product.stock_quantity || 0,
              product.image_url || null,
            ],
          );
          const pid = r.rows[0].id;
          await client.query(
            `INSERT INTO product_translations (product_id, lang_code, name) VALUES ($1,'en',$2)`,
            [pid, product.name_en],
          );
          let teluguName = product.name_te;
          if (!teluguName) {
            const { name_te } = await translateProductFields(
              product.name_en,
              null,
            );
            teluguName = name_te;
          }
          if (teluguName) {
            await client.query(
              `INSERT INTO product_translations (product_id, lang_code, name) VALUES ($1,'te',$2)`,
              [pid, teluguName],
            );
          }
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            row: product._rowIndex,
            sku: product.sku,
            error: err.message,
          });
        }
      }
      return results;
    });
  }
}
module.exports = Product;

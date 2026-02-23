const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
const { translateProductFields } = require('../utils/translate');

// Translation JOIN helper (lang = $1 parameter position)
const buildTransJoins = (langParam) => `
  LEFT JOIN product_translations    pt_req ON p.id = pt_req.product_id AND pt_req.lang_code = ${langParam}
  LEFT JOIN product_translations    pt_en  ON p.id = pt_en.product_id  AND pt_en.lang_code  = 'en'
  LEFT JOIN category_translations   ct_req ON c.id = ct_req.category_id AND ct_req.lang_code = ${langParam}
  LEFT JOIN category_translations   ct_en  ON c.id = ct_en.category_id  AND ct_en.lang_code  = 'en'
`;
const PROD_TRANS_COLS = `
  COALESCE(pt_req.name,        pt_en.name)        AS name,
  COALESCE(pt_req.description, pt_en.description) AS description,
  pt_en.name        AS name_en,
  pt_en.description AS description_en,
  COALESCE(ct_req.name, ct_en.name) AS category_name
`;

class Product {
  static async findById(id, lang = 'en') {
    const row = await queryOne(
      `SELECT p.*, c.id AS cat_id, ${PROD_TRANS_COLS}
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins('$1')}
       WHERE p.id = $2`,
      [lang, id]
    );
    return row || null;
  }

  static async findBySku(sku) {
    return queryOne('SELECT * FROM products WHERE sku = $1', [sku]);
  }

  static async findAll(options = {}) {
    const {
      page = 1, limit = 20,
      categoryId = null, isActive = null, isFeatured = null,
      search = null, minPrice = null, maxPrice = null, inStock = null,
      stockThreshold = null,
      sortBy = 'name', sortOrder = 'ASC', lang = 'en',
    } = options;
    const offset = (page - 1) * limit;

    const conds  = [];
    const params = [lang];   // $1 = lang
    let   idx    = 2;

    if (categoryId)           { conds.push(`p.category_id = $${idx++}`);       params.push(categoryId); }
    if (isActive !== null)    { conds.push(`p.is_active = $${idx++}`);         params.push(isActive ? true : false); }
    if (isFeatured !== null)  { conds.push(`p.is_featured = $${idx++}`);     params.push(isFeatured ? true : false); }
    if (search) {
      conds.push(`(pt_en.name ILIKE $${idx} OR p.sku ILIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }
    if (minPrice !== null)    { conds.push(`p.price >= $${idx++}`);            params.push(minPrice); }
    if (maxPrice !== null)    { conds.push(`p.price <= $${idx++}`);            params.push(maxPrice); }
    if (inStock)              { conds.push('p.stock_quantity > 0'); }
    if (stockThreshold !== null) { conds.push(`p.stock_quantity <= $${idx++}`); params.push(stockThreshold); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const allowedSort = { name: 'pt_en.name', price: 'p.price', created_at: 'p.created_at', stock_quantity: 'p.stock_quantity' };
    const sortCol  = allowedSort[sortBy] || 'pt_en.name';
    const sortDir  = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins('$1')}
       ${where}`,
      params
    );

    const listParams = [...params, limit, offset];
    const rows = await query(
      `SELECT p.*, ${PROD_TRANS_COLS}
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${buildTransJoins('$1')}
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      listParams
    );

    return { products: rows, total: parseInt(countRow.total, 10) };
  }

  static async create(data) {
    const {
      category_id, sku, name_en, name_te, description_en, description_te,
      brand, variant, unit_type, unit_pack_size, hsn_code,
      mrp, purchase_price, price, wholesale_price, gst_percentage,
      discount, margin,
      stock_quantity, min_order_quantity, max_order_quantity,
      image_url, is_active, is_featured,
    } = data;

    const prodId = await insert(
      `INSERT INTO products
         (category_id, sku, brand, variant, unit_type, unit_pack_size, hsn_code,
          mrp, purchase_price, price, wholesale_price, gst_percentage, discount, margin,
          stock_quantity, min_order_quantity, max_order_quantity, image_url, is_active, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        category_id, sku || null, brand || null, variant || null,
        unit_type || null, unit_pack_size || null, hsn_code || null,
        mrp || null, purchase_price || null, price,
        wholesale_price || null, gst_percentage || 18, discount || null, margin || null,
        stock_quantity || 0, min_order_quantity || 1, max_order_quantity || null,
        image_url || null, is_active !== false, is_featured || false,
      ]
    );

    await modify(
      `INSERT INTO product_translations (product_id, lang_code, name, description) VALUES ($1,'en',$2,$3)`,
      [prodId, name_en, description_en || null]
    );

    // Auto-translate to Telugu if not provided
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
        [prodId, teluguName, teluguDesc || null]
      );
    }
    return prodId;
  }

  static async update(id, data) {
    // Base columns
    const base = ['category_id','sku','brand','variant','unit_type','unit_pack_size','hsn_code',
                  'mrp','purchase_price','price','wholesale_price','gst_percentage','discount','margin',
                  'stock_quantity','min_order_quantity','max_order_quantity','image_url','is_active','is_featured'];
    const fields = []; const vals = []; let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (base.includes(k) && v !== undefined) { fields.push(`${k} = $${idx++}`); vals.push(v); }
    }
    if (fields.length) { vals.push(id); await modify(`UPDATE products SET ${fields.join(', ')} WHERE id = $${idx}`, vals); }

    // Upsert translations
    const upsert = async (lang, name, desc) => {
      if (!name) return;
      await modify(
        `INSERT INTO product_translations (product_id, lang_code, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id, lang_code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [id, lang, name, desc || null]
      );
    };
    await upsert('en', data.name_en, data.description_en);

    // Auto-translate to Telugu if English is provided but Telugu is not
    let teluguName = data.name_te;
    let teluguDesc = data.description_te;
    if (data.name_en && !teluguName) {
      const translated = await translateProductFields(data.name_en, data.description_en);
      teluguName = translated.name_te;
      teluguDesc = teluguDesc || translated.description_te;
    }
    await upsert('te', teluguName, teluguDesc);
    return this.findById(id);
  }

  static async delete(id) {
    return modify('DELETE FROM products WHERE id = $1', [id]);
  }

  static async updateStock(id, quantity) {
    return modify(
      'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
      [quantity, id]
    );
  }

  static async reduceStock(id, quantity) {
    return modify(
      'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
      [quantity, id]
    );
  }

  static async checkStock(id, quantity) {
    const r = await queryOne('SELECT stock_quantity FROM products WHERE id = $1 AND is_active = TRUE', [id]);
    return r && r.stock_quantity >= quantity;
  }

  static async count() {
    const r = await queryOne('SELECT COUNT(*) AS count FROM products');
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
            [product.category_id, product.sku, product.brand || null, product.variant || null,
             product.unit_type || null, product.unit_pack_size || null, product.hsn_code || null,
             product.mrp || null, product.purchase_price || null, product.price,
             product.gst_percentage || 18, product.discount || null, product.margin || null,
             product.stock_quantity || 0, product.image_url || null]
          );
          const pid = r.rows[0].id;
          await client.query(
            `INSERT INTO product_translations (product_id, lang_code, name) VALUES ($1,'en',$2)`,
            [pid, product.name_en]
          );

          // Auto-translate to Telugu if not provided
          let teluguName = product.name_te;
          if (!teluguName) {
            const { name_te } = await translateProductFields(product.name_en, null);
            teluguName = name_te;
          }
          if (teluguName) {
            await client.query(
              `INSERT INTO product_translations (product_id, lang_code, name) VALUES ($1,'te',$2)`,
              [pid, teluguName]
            );
          }
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ row: product._rowIndex, sku: product.sku, error: err.message });
        }
      }
      return results;
    });
  }
}

module.exports = Product;

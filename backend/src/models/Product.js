const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
const { getLocalizedField } = require('../utils/helpers');

class Product {
  /**
   * Find product by ID
   */
  static async findById(id, lang = 'en') {
    const product = await queryOne(
      `SELECT p.*, c.name_en as category_name_en, c.name_te as category_name_te
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (product) {
      return this.formatProduct(product, lang);
    }
    return null;
  }

  /**
   * Find product by SKU
   */
  static async findBySku(sku) {
    return queryOne('SELECT * FROM products WHERE sku = ?', [sku]);
  }

  /**
   * Get all products
   */
  static async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      categoryId = null, 
      isActive = null, 
      isFeatured = null,
      search = null, 
      minPrice = null,
      maxPrice = null,
      inStock = null,
      sortBy = 'name_en',
      sortOrder = 'ASC',
      lang = 'en' 
    } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    let params = [];

    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (isActive !== null) {
      whereConditions.push('p.is_active = ?');
      params.push(isActive);
    }

    if (isFeatured !== null) {
      whereConditions.push('p.is_featured = ?');
      params.push(isFeatured);
    }

    if (search) {
      whereConditions.push('(p.name_en LIKE ? OR p.name_te LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (minPrice !== null) {
      whereConditions.push('p.price >= ?');
      params.push(minPrice);
    }

    if (maxPrice !== null) {
      whereConditions.push('p.price <= ?');
      params.push(maxPrice);
    }

    if (inStock) {
      whereConditions.push('p.stock_quantity > 0');
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort fields
    const allowedSortFields = ['name_en', 'price', 'created_at', 'stock_quantity'];
    const sortField = allowedSortFields.includes(sortBy) ? `p.${sortBy}` : 'p.name_en';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total 
       FROM products p 
       WHERE ${whereClause}`,
      params
    );

    // Get products (use inline LIMIT/OFFSET to avoid MySQL2 parameter issues)
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;
    const products = await query(
      `SELECT p.*, c.name_en as category_name_en, c.name_te as category_name_te
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE ${whereClause}
       ORDER BY ${sortField} ${order}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return {
      products: products.map(prod => this.formatProduct(prod, lang)),
      total: countResult.total,
    };
  }

  /**
   * Create product
   */
  static async create(productData) {
    const {
      category_id, sku, name_en, name_te, description_en, description_te,
      unit_type, price, wholesale_price, gst_percentage, stock_quantity,
      min_order_quantity, max_order_quantity, image_url, is_active, is_featured
    } = productData;

    return insert(
      `INSERT INTO products (
        category_id, sku, name_en, name_te, description_en, description_te,
        unit_type, price, wholesale_price, gst_percentage, stock_quantity,
        min_order_quantity, max_order_quantity, image_url, is_active, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id, sku || null, name_en, name_te || null, description_en || null, description_te || null,
        unit_type, price, wholesale_price || null, gst_percentage || 18, stock_quantity || 0,
        min_order_quantity || 1, max_order_quantity || null, image_url || null, 
        is_active !== false, is_featured || false
      ]
    );
  }

  /**
   * Update product
   */
  static async update(id, productData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'category_id', 'sku', 'name_en', 'name_te', 'description_en', 'description_te',
      'unit_type', 'price', 'wholesale_price', 'gst_percentage', 'stock_quantity',
      'min_order_quantity', 'max_order_quantity', 'image_url', 'is_active', 'is_featured'
    ];

    for (const [key, value] of Object.entries(productData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return 0;

    values.push(id);
    return modify(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete product
   */
  static async delete(id) {
    return modify('DELETE FROM products WHERE id = ?', [id]);
  }

  /**
   * Update stock
   */
  static async updateStock(id, quantity) {
    return modify(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
      [quantity, id]
    );
  }

  /**
   * Reduce stock
   */
  static async reduceStock(id, quantity) {
    return modify(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
      [quantity, id, quantity]
    );
  }

  /**
   * Check stock availability
   */
  static async checkStock(id, quantity) {
    const result = await queryOne(
      'SELECT stock_quantity FROM products WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return result && result.stock_quantity >= quantity;
  }

  /**
   * Count total products
   */
  static async count() {
    const result = await queryOne('SELECT COUNT(*) as count FROM products');
    return result.count;
  }

  /**
   * Bulk insert products (for Excel upload)
   */
  static async bulkInsert(products) {
    return withTransaction(async (connection) => {
      const results = { success: 0, failed: 0, errors: [] };

      for (const product of products) {
        try {
          await connection.execute(
            `INSERT INTO products (
              category_id, sku, name_en, name_te, unit_type, price, 
              gst_percentage, stock_quantity, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
              product.category_id, product.sku, product.name_en, product.name_te || null,
              product.unit_type, product.price, product.gst_percentage || 18, 
              product.stock_quantity || 0
            ]
          );
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: product._rowIndex,
            sku: product.sku,
            error: error.message,
          });
        }
      }

      return results;
    });
  }

  /**
   * Format product with localized fields
   */
  static formatProduct(product, lang = 'en') {
    return {
      id: product.id,
      category_id: product.category_id,
      category_name: getLocalizedField(product, 'category_name', lang),
      sku: product.sku,
      name: getLocalizedField(product, 'name', lang),
      name_en: product.name_en,
      name_te: product.name_te,
      description: getLocalizedField(product, 'description', lang),
      description_en: product.description_en,
      description_te: product.description_te,
      unit_type: product.unit_type,
      price: parseFloat(product.price),
      wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : null,
      gst_percentage: parseFloat(product.gst_percentage),
      stock_quantity: product.stock_quantity,
      min_order_quantity: product.min_order_quantity,
      max_order_quantity: product.max_order_quantity,
      image_url: product.image_url,
      is_active: product.is_active,
      is_featured: product.is_featured,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }
}

module.exports = Product;

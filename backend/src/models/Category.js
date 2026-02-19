const { query, queryOne, insert, modify } = require('../config/database');
const { getLocalizedField } = require('../utils/helpers');

class Category {
  /**
   * Find category by ID
   */
  static async findById(id, lang = 'en') {
    const category = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (category) {
      return this.formatCategory(category, lang);
    }
    return null;
  }

  /**
   * Get all categories
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 50, isActive = null, search = null, lang = 'en' } = options;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (isActive !== null && isActive !== undefined) {
      whereConditions.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (search) {
      whereConditions.push('(name_en LIKE ? OR name_te LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM categories ${whereClause}`;
    const countResult = await queryOne(countSql, params);

    // Get categories with pagination
    const selectSql = `SELECT * FROM categories ${whereClause}
       ORDER BY display_order ASC, name_en ASC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const categories = await query(selectSql, params);

    return {
      categories: categories.map(cat => this.formatCategory(cat, lang)),
      total: countResult ? countResult.total : 0,
    };
  }

  /**
   * Create category
   */
  static async create(categoryData) {
    const { name_en, name_te, description_en, description_te, image_url, display_order, is_active } = categoryData;
    return insert(
      `INSERT INTO categories (name_en, name_te, description_en, description_te, image_url, display_order, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name_en, name_te || null, description_en || null, description_te || null, image_url || null, display_order || 0, is_active !== false]
    );
  }

  /**
   * Update category
   */
  static async update(id, categoryData) {
    const fields = [];
    const values = [];

    const allowedFields = ['name_en', 'name_te', 'description_en', 'description_te', 'image_url', 'display_order', 'is_active'];

    for (const [key, value] of Object.entries(categoryData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return 0;

    values.push(id);
    return modify(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete category
   */
  static async delete(id) {
    return modify('DELETE FROM categories WHERE id = ?', [id]);
  }

  /**
   * Check if category has products
   */
  static async hasProducts(id) {
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    return result.count > 0;
  }

  /**
   * Format category with localized fields
   */
  static formatCategory(category, lang = 'en') {
    return {
      id: category.id,
      name: getLocalizedField(category, 'name', lang),
      name_en: category.name_en,
      name_te: category.name_te,
      description: getLocalizedField(category, 'description', lang),
      description_en: category.description_en,
      description_te: category.description_te,
      image_url: category.image_url,
      display_order: category.display_order,
      is_active: category.is_active,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };
  }
}

module.exports = Category;

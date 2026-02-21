const { query, queryOne, insert, modify } = require('../config/database');

// SQL fragment: join translations with English fallback
const TRANS_JOIN = `
  LEFT JOIN category_translations t_req ON c.id = t_req.category_id AND t_req.lang_code = $1
  LEFT JOIN category_translations t_en  ON c.id = t_en.category_id  AND t_en.lang_code  = 'en'
`;
const TRANS_COLS = `
  COALESCE(t_req.name,        t_en.name)        AS name,
  COALESCE(t_req.description, t_en.description) AS description,
  t_en.name        AS name_en,
  t_en.description AS description_en
`;

class Category {
  static async findById(id, lang = 'en') {
    const row = await queryOne(
      `SELECT c.*, ${TRANS_COLS} FROM categories c ${TRANS_JOIN} WHERE c.id = $2`,
      [lang, id]
    );
    return row || null;
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 50, isActive = null, search = null, lang = 'en' } = options;
    const offset = (page - 1) * limit;

    const conds  = [];
    const params = [lang];   // $1 = lang
    let   idx    = 2;

    if (isActive !== null) { conds.push(`c.is_active = $${idx++}`);         params.push(isActive ? true : false); }
    if (search)            { conds.push(`t_en.name ILIKE $${idx++}`);       params.push(`%${search}%`); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM categories c ${TRANS_JOIN} ${where}`,
      params
    );

    const listParams = [...params, limit, offset];
    const rows = await query(
      `SELECT c.*, ${TRANS_COLS}
       FROM categories c ${TRANS_JOIN}
       ${where}
       ORDER BY c.display_order ASC, t_en.name ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      listParams
    );

    return { categories: rows, total: parseInt(countRow.total, 10) };
  }

  static async create(data) {
    const { name_en, name_te, description_en, description_te, image_url, display_order, is_active } = data;
    const catId = await insert(
      `INSERT INTO categories (image_url, display_order, is_active)
       VALUES ($1, $2, $3) RETURNING id`,
      [image_url || null, display_order || 0, is_active !== false]
    );
    await modify(
      `INSERT INTO category_translations (category_id, lang_code, name, description) VALUES ($1, 'en', $2, $3)`,
      [catId, name_en, description_en || null]
    );
    if (name_te) {
      await modify(
        `INSERT INTO category_translations (category_id, lang_code, name, description) VALUES ($1, 'te', $2, $3)`,
        [catId, name_te, description_te || null]
      );
    }
    return catId;
  }

  static async update(id, data) {
    // Update base columns
    const baseAllowed = ['image_url', 'display_order', 'is_active'];
    const fields = []; const vals = []; let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (baseAllowed.includes(k) && v !== undefined) { fields.push(`${k} = $${idx++}`); vals.push(v); }
    }
    if (fields.length) { vals.push(id); await modify(`UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx}`, vals); }

    // Upsert translations
    const upsertTrans = async (lang, name, desc) => {
      if (!name) return;
      await modify(
        `INSERT INTO category_translations (category_id, lang_code, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (category_id, lang_code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [id, lang, name, desc || null]
      );
    };
    await upsertTrans('en', data.name_en, data.description_en);
    await upsertTrans('te', data.name_te, data.description_te);
    return this.findById(id);
  }

  static async delete(id) {
    return modify('DELETE FROM categories WHERE id = $1', [id]);
  }

  static async hasProducts(id) {
    const r = await queryOne('SELECT COUNT(*) AS count FROM products WHERE category_id = $1', [id]);
    return parseInt(r.count, 10) > 0;
  }
}

module.exports = Category;

const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
class Promotion {
  static async findById(id) {
    const promo = await queryOne(
      `SELECT p.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', pp.product_id,
                  'name', pt.name,
                  'variant', prod.variant,
                  'image_url', prod.image_url,
                  'custom_discount_value', pp.custom_discount_value
                ) ORDER BY pp.created_at
              ) FILTER (WHERE pp.product_id IS NOT NULL), '[]') AS product_ids
       FROM promotions p
       LEFT JOIN promotion_products pp ON pp.promotion_id = p.id
       LEFT JOIN products prod ON pp.product_id = prod.id
       LEFT JOIN product_translations pt ON pp.product_id = pt.product_id AND pt.lang_code = 'en'
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return promo || null;
  }
  static async findAll(options = {}) {
    const {
      page = 1, limit = 20,
      type = null, isActive = null,
      status = null,                 
      sortBy = 'starts_at', sortOrder = 'DESC',
    } = options;
    const offset = (page - 1) * limit;
    const conds = [];
    const params = [];
    let idx = 1;
    if (type) {
      conds.push(`p.type = $${idx++}`);
      params.push(type);
    }
    if (isActive !== null) {
      conds.push(`p.is_active = $${idx++}`);
      params.push(isActive);
    }
    const now = new Date().toISOString();
    if (status === 'upcoming') {
      conds.push(`p.starts_at > $${idx++}`);
      params.push(now);
    } else if (status === 'active') {
      conds.push(`p.starts_at <= $${idx} AND p.ends_at >= $${idx + 1}`);
      params.push(now, now);
      idx += 2;
    } else if (status === 'expired') {
      conds.push(`p.ends_at < $${idx++}`);
      params.push(now);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const allowedSort = {
      starts_at:  'p.starts_at',
      ends_at:    'p.ends_at',
      created_at: 'p.created_at',
      priority:   'p.priority',
      title:      'p.title',
    };
    const sortCol = allowedSort[sortBy] || 'p.starts_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM promotions p ${where}`,
      params
    );
    const listParams = [...params, limit, offset];
    const rows = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM promotion_products pp WHERE pp.promotion_id = p.id) AS product_count
       FROM promotions p
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      listParams
    );
    return { promotions: rows, total: parseInt(countRow.total, 10) };
  }
  static async findActive() {
    return query(
      `SELECT p.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', pp.product_id,
                  'name', pt.name,
                  'variant', prod.variant,
                  'image_url', prod.image_url,
                  'custom_discount_value', pp.custom_discount_value
                ) ORDER BY pp.created_at
              ) FILTER (WHERE pp.product_id IS NOT NULL), '[]') AS products
       FROM promotions p
       LEFT JOIN promotion_products pp ON pp.promotion_id = p.id
       LEFT JOIN products prod ON pp.product_id = prod.id
       LEFT JOIN product_translations pt ON pp.product_id = pt.product_id AND pt.lang_code = 'en'
       WHERE p.is_active = TRUE
         AND p.starts_at <= NOW()
         AND p.ends_at   >= NOW()
       GROUP BY p.id
       ORDER BY p.priority DESC, p.starts_at ASC`
    );
  }
  static async findUpcoming(days = 7) {
    return query(
      `SELECT id, title, description, type, discount_type, discount_value,
              banner_image_url, banner_text, theme_color, badge_text,
              starts_at, ends_at, priority
       FROM promotions
       WHERE is_active = TRUE
         AND starts_at > NOW()
         AND starts_at <= NOW() + INTERVAL '${parseInt(days)} days'
       ORDER BY starts_at ASC`
    );
  }
  static async create(data) {
    const {
      title, description, type, discount_type, discount_value,
      banner_image_url, banner_text, theme_color, badge_text,
      starts_at, ends_at, is_active, priority, recurrence_rule,
      product_ids,                    
    } = data;
    return withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO promotions
           (title, description, type, discount_type, discount_value,
            banner_image_url, banner_text, theme_color, badge_text,
            starts_at, ends_at, is_active, priority, recurrence_rule)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          title, description || null, type || 'limited_time',
          discount_type || 'percentage', discount_value ?? 0,
          banner_image_url || null, banner_text || null,
          theme_color || '#FF6B00', badge_text || 'LIMITED OFFER',
          starts_at, ends_at,
          is_active !== false, priority ?? 0, recurrence_rule || null,
        ]
      );
      const promoId = res.rows[0].id;
      if (product_ids?.length) {
        const vals = product_ids.map((p, i) => {
          const pid = typeof p === 'string' ? p : p.id;
          const cdv = typeof p === 'object' ? p.custom_discount_value : null;
          return `($1, $${i * 2 + 2}, $${i * 2 + 3})`;
        });
        const flatParams = [promoId];
        for (const p of product_ids) {
          flatParams.push(typeof p === 'string' ? p : p.id);
          flatParams.push(typeof p === 'object' ? (p.custom_discount_value ?? null) : null);
        }
        await client.query(
          `INSERT INTO promotion_products (promotion_id, product_id, custom_discount_value)
           VALUES ${vals.join(',')}`,
          flatParams
        );
      }
      return promoId;
    });
  }
  static async update(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    const allowed = [
      'title', 'description', 'type', 'discount_type', 'discount_value',
      'banner_image_url', 'banner_text', 'theme_color', 'badge_text',
      'starts_at', 'ends_at', 'is_active', 'priority', 'recurrence_rule',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0 && !data.product_ids) return;
    return withTransaction(async (client) => {
      if (fields.length) {
        params.push(id);
        await client.query(
          `UPDATE promotions SET ${fields.join(', ')} WHERE id = $${idx}`,
          params
        );
      }
      if (data.product_ids !== undefined) {
        await client.query(`DELETE FROM promotion_products WHERE promotion_id = $1`, [id]);
        if (data.product_ids?.length) {
          const vals = data.product_ids.map((_, i) =>
            `($1, $${i * 2 + 2}, $${i * 2 + 3})`
          );
          const fp = [id];
          for (const p of data.product_ids) {
            fp.push(typeof p === 'string' ? p : p.id);
            fp.push(typeof p === 'object' ? (p.custom_discount_value ?? null) : null);
          }
          await client.query(
            `INSERT INTO promotion_products (promotion_id, product_id, custom_discount_value)
             VALUES ${vals.join(',')}`,
            fp
          );
        }
      }
    });
  }
  static async delete(id) {
    return modify('DELETE FROM promotions WHERE id = $1', [id]);
  }
  static async findActiveForProduct(productId) {
    return queryOne(
      `SELECT p.*, pp.custom_discount_value
       FROM promotions p
       JOIN promotion_products pp ON pp.promotion_id = p.id
       WHERE pp.product_id = $1
         AND p.is_active = TRUE
         AND p.starts_at <= NOW()
         AND p.ends_at   >= NOW()
       ORDER BY p.priority DESC, p.starts_at ASC
       LIMIT 1`,
      [productId]
    );
  }
  static async getActiveProductMap() {
    const rows = await query(
      `SELECT pp.product_id,
              p.id AS promotion_id,
              p.title, p.badge_text, p.theme_color, p.discount_type, p.discount_value,
              p.ends_at, p.type,
              pp.custom_discount_value
       FROM promotions p
       JOIN promotion_products pp ON pp.promotion_id = p.id
       WHERE p.is_active = TRUE
         AND p.starts_at <= NOW()
         AND p.ends_at   >= NOW()
       ORDER BY p.priority DESC`
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.product_id]) {
        map[r.product_id] = {
          promotion_id: r.promotion_id,
          title: r.title,
          badge_text: r.badge_text,
          theme_color: r.theme_color,
          discount_type: r.discount_type,
          discount_value: parseFloat(r.custom_discount_value ?? r.discount_value),
          ends_at: r.ends_at,
          type: r.type,
        };
      }
    }
    return map;
  }
}
module.exports = Promotion;
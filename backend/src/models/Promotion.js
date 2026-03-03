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
                  'custom_discount_value', pp.custom_discount_value,
                  'deal_limit', pp.deal_limit,
                  'deals_claimed', pp.deals_claimed
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
    // Filter by time status to show different promo lists (upcoming, active, expired)
    if (status === 'upcoming') {
      conds.push(`p.starts_at > $${idx++}`);
      params.push(now);
    } else if (status === 'active') {
      // Active means current time is within promotion window
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
                  'custom_discount_value', pp.custom_discount_value,
                  'deal_limit', pp.deal_limit,
                  'deals_claimed', pp.deals_claimed
                ) ORDER BY pp.created_at
              ) FILTER (WHERE pp.product_id IS NOT NULL), '[]') AS products,
              fpt.name        AS free_product_name,
              fp.image_url    AS free_product_image,
              fp.variant      AS free_product_variant
       FROM promotions p
       LEFT JOIN promotion_products pp ON pp.promotion_id = p.id
       LEFT JOIN products prod ON pp.product_id = prod.id
       LEFT JOIN product_translations pt ON pp.product_id = pt.product_id AND pt.lang_code = 'en'
       LEFT JOIN products fp  ON fp.id = p.free_product_id
       LEFT JOIN product_translations fpt ON fp.id = fpt.product_id AND fpt.lang_code = 'en'
       WHERE p.is_active = TRUE
         AND p.starts_at <= NOW()
         AND p.ends_at   >= NOW()
       GROUP BY p.id, fpt.name, fp.image_url, fp.variant
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
      min_order_amount, reward_type, free_product_id,
    } = data;
    return withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO promotions
           (title, description, type, discount_type, discount_value,
            banner_image_url, banner_text, theme_color, badge_text,
            starts_at, ends_at, is_active, priority, recurrence_rule,
            min_order_amount, reward_type, free_product_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id`,
        [
          title, description || null, type || 'limited_time',
          discount_type || 'percentage', discount_value ?? 0,
          banner_image_url || null, banner_text || null,
          theme_color || '#FF6B00', badge_text || 'LIMITED OFFER',
          starts_at, ends_at,
          is_active !== false, priority ?? 0, recurrence_rule || null,
          min_order_amount || null, reward_type || null, free_product_id || null,
        ]
      );
      const promoId = res.rows[0].id;
      if (product_ids?.length) {
        const vals = product_ids.map((_, i) =>
          `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`
        );
        const flatParams = [promoId];
        for (const p of product_ids) {
          flatParams.push(typeof p === 'string' ? p : p.id);
          flatParams.push(typeof p === 'object' ? (p.custom_discount_value ?? null) : null);
          flatParams.push(typeof p === 'object' ? (p.deal_limit  ?? null) : null);
          flatParams.push(typeof p === 'object' ? (p.item_limit  ?? null) : null);
        }
        await client.query(
          `INSERT INTO promotion_products
             (promotion_id, product_id, custom_discount_value, deal_limit, item_limit)
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
      'min_order_amount', 'reward_type', 'free_product_id',
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
            `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`
          );
          const fp = [id];
          for (const p of data.product_ids) {
            fp.push(typeof p === 'string' ? p : p.id);
            fp.push(typeof p === 'object' ? (p.custom_discount_value ?? null) : null);
            fp.push(typeof p === 'object' ? (p.deal_limit  ?? null) : null);
            fp.push(typeof p === 'object' ? (p.item_limit  ?? null) : null);
          }
          await client.query(
            `INSERT INTO promotion_products
               (promotion_id, product_id, custom_discount_value, deal_limit, item_limit)
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
              pp.custom_discount_value,
              pp.deal_limit,
              pp.deals_claimed,
              pp.item_limit,
              pp.items_claimed
       FROM promotions p
       JOIN promotion_products pp ON pp.promotion_id = p.id
       WHERE p.is_active = TRUE
         AND p.starts_at <= NOW()
         AND p.ends_at   >= NOW()
         AND p.discount_type != 'threshold'
       ORDER BY p.priority DESC`
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.product_id]) {
        const dealLimit    = r.deal_limit    != null ? parseInt(r.deal_limit, 10)    : null;
        const dealsClaimed = r.deals_claimed != null ? parseInt(r.deals_claimed, 10) : 0;
        const itemLimit    = r.item_limit    != null ? parseInt(r.item_limit, 10)    : null;
        const itemsClaimed = r.items_claimed != null ? parseInt(r.items_claimed, 10) : 0;
        // Deal exhausted if either the per-order cap OR the per-unit cap is reached
        const dealExhausted =
          (dealLimit !== null && dealsClaimed >= dealLimit) ||
          (itemLimit !== null && itemsClaimed >= itemLimit);
        map[r.product_id] = {
          promotion_id:   r.promotion_id,
          title:          r.title,
          badge_text:     r.badge_text,
          theme_color:    r.theme_color,
          discount_type:  r.discount_type,
          discount_value: dealExhausted
            ? 0
            : parseFloat(r.custom_discount_value ?? r.discount_value),
          ends_at:        r.ends_at,
          type:           r.type,
          deal_limit:     dealLimit,
          deals_claimed:  dealsClaimed,
          item_limit:     itemLimit,
          items_claimed:  itemsClaimed,
          deal_exhausted: dealExhausted,
        };
      }
    }
    return map;
  }

  /**
   * Returns all currently active threshold promotions (cart-total based).
   * These are applied in orderService when the cart total meets the threshold.
   */
  static async getActiveThresholdPromos() {
    return query(
      `SELECT id, title, discount_type, discount_value,
              min_order_amount, reward_type, free_product_id, priority
       FROM promotions
       WHERE is_active = TRUE
         AND starts_at <= NOW()
         AND ends_at   >= NOW()
         AND discount_type = 'threshold'
       ORDER BY priority DESC`
    );
  }

  /**
   * Atomically claim one deal slot + qty item slots for a product in a promotion.
   * Both deal_limit (per-order cap) AND item_limit (per-unit cap) are checked.
   * Returns { claimed: true, ... } on success.
   * Returns { claimed: false } when either limit is already reached.
   */
  static async claimDeal(promotionId, productId, qty = 1) {
    const result = await queryOne(
      `UPDATE promotion_products
         SET deals_claimed = deals_claimed + 1,
             items_claimed = items_claimed + $3
       WHERE promotion_id = $1
         AND product_id   = $2
         AND (deal_limit IS NULL OR deals_claimed < deal_limit)
         AND (item_limit IS NULL OR items_claimed + $3 <= item_limit)
       RETURNING deals_claimed, deal_limit, items_claimed, item_limit`,
      [promotionId, productId, qty]
    );
    if (!result) return { claimed: false };
    return {
      claimed:       true,
      deals_claimed: parseInt(result.deals_claimed, 10),
      deal_limit:    result.deal_limit != null ? parseInt(result.deal_limit, 10) : null,
      items_claimed: parseInt(result.items_claimed, 10),
      item_limit:    result.item_limit != null ? parseInt(result.item_limit, 10) : null,
    };
  }

  /**
   * Reverse a deal claim — called when an order is cancelled.
   * Decrements deals_claimed by 1 and items_claimed by qty, floored at 0.
   * Uses a JOIN on order_items so we only unclaim products that were
   * actually part of this order AND this promotion.
   */
  static async unclaimDealsByOrder(orderId, promotionId) {
    // Single UPDATE-FROM-JOIN: safe if promotion has since been deleted (no rows = no-op)
    return modify(
      `UPDATE promotion_products pp
         SET deals_claimed = GREATEST(0, pp.deals_claimed - 1),
             items_claimed = GREATEST(0, pp.items_claimed - oi.quantity)
         FROM order_items oi
        WHERE oi.order_id     = $1
          AND pp.promotion_id = $2
          AND pp.product_id   = oi.product_id`,
      [orderId, promotionId]
    );
  }

  /**
   * Reset both claim counters to 0 for one (or all) products in a promotion.
   * Used by admin when restarting a promotion or correcting data.
   */
  static async resetDeals(promotionId, productId = null) {
    if (productId) {
      return modify(
        `UPDATE promotion_products
            SET deals_claimed = 0, items_claimed = 0
          WHERE promotion_id = $1 AND product_id = $2`,
        [promotionId, productId]
      );
    }
    return modify(
      `UPDATE promotion_products
          SET deals_claimed = 0, items_claimed = 0
        WHERE promotion_id = $1`,
      [promotionId]
    );
  }
}
module.exports = Promotion;

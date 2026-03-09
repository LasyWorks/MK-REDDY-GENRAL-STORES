const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
const { generateOrderNumber, parseVariantToKg } = require('../utils/helpers');
class Order {
  static async findById(id, lang = 'en') {
    const order = await queryOne(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.user_type
       FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
      [id]
    );
    if (order) { const items = await this.getOrderItems(id, lang); return { ...this.formatOrder(order), items }; }
    return null;
  }
  static async findByOrderNumber(orderNumber, lang = 'en') {
    const order = await queryOne(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.user_type
       FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_number = $1`,
      [orderNumber]
    );
    if (order) { const items = await this.getOrderItems(order.id, lang); return { ...this.formatOrder(order), items }; }
    return null;
  }
  static async getOrderItems(orderId, lang = 'en') {
    const items = await query(
      `SELECT oi.*, p.image_url,
              COALESCE(oi.product_variant, p.variant, p.unit_pack_size) AS variant,
              COALESCE(pt_req.name, oi.product_name_en) AS product_name
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_translations pt_req ON oi.product_id = pt_req.product_id AND pt_req.lang_code = $2
       WHERE oi.order_id = $1`,
      [orderId, lang]
    );
    return items.map(i => ({
      id: i.id, product_id: i.product_id,
      product_name: i.product_name, product_name_en: i.product_name_en,
      variant: i.variant || null,
      quantity: i.quantity, unit_type: i.unit_type,
      unit_price: parseFloat(i.unit_price), gst_percentage: parseFloat(i.gst_percentage),
      gst_amount: parseFloat(i.gst_amount), subtotal: parseFloat(i.subtotal), total: parseFloat(i.total),
      image_url: i.image_url || null,
    }));
  }
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 10, status = null, lang = 'en' } = options;
    const offset = (page - 1) * limit;
    const conds = ['o.user_id = $1']; const params = [userId]; let idx = 2;
    if (status) { conds.push(`o.status = $${idx++}`); params.push(status); }
    const where = conds.join(' AND ');
    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, params);
    const rows = await query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.user_type,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
              ARRAY(
                SELECT p.image_url FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id AND p.image_url IS NOT NULL
                LIMIT 4
              ) AS item_images
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    return {
      orders: rows.map(r => ({
        ...this.formatOrder(r),
        item_count: parseInt(r.item_count || 0, 10),
        item_images: r.item_images || [],
      })),
      total: parseInt(countRow.total, 10),
    };
  }
  static async findAll(options = {}) {
    const { page = 1, limit = 10, status = null, userId = null, startDate = null, endDate = null, search = null } = options;
    const offset = (page - 1) * limit;
    const conds = ['1=1']; const params = []; let idx = 1;
    if (status)    { conds.push(`o.status = $${idx++}`);             params.push(status); }
    if (userId)    { conds.push(`o.user_id = $${idx++}`);            params.push(userId); }
    if (startDate) { conds.push(`o.created_at::date >= $${idx++}`);  params.push(startDate); }
    if (endDate)   { conds.push(`o.created_at::date <= $${idx++}`);  params.push(endDate); }
    if (search)    { conds.push(`(u.name ILIKE $${idx} OR u.phone LIKE $${idx} OR o.order_number ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conds.join(' AND ');
    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM orders o JOIN users u ON o.user_id = u.id WHERE ${where}`, params);
    const rows = await query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.user_type,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
              ARRAY(SELECT oi.product_name_en FROM order_items oi WHERE oi.order_id = o.id LIMIT 3) AS item_names
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    return { orders: rows.map(r => ({ ...this.formatOrder(r), item_count: parseInt(r.item_count || 0, 10), item_names: r.item_names || [] })), total: parseInt(countRow.total, 10) };
  }
  static async createFromCart(userId, cart, notes = null, promo = {}) {
    const { promotionId = null, promotionDiscount = 0, promotionTitle = null, freeProductId = null } = promo;
    return withTransaction(async (client) => {
      const orderNumber = generateOrderNumber();
      const finalTotal = parseFloat((cart.total - promotionDiscount).toFixed(2));
      const oRes = await client.query(
        `INSERT INTO orders (user_id, order_number, status, subtotal, total_gst, total_amount, notes, promotion_id, promotion_discount, promotion_title)
         VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [userId, orderNumber, cart.subtotal, cart.total_gst, Math.max(finalTotal, 0), notes, promotionId, promotionDiscount, promotionTitle]
      );
      const orderId = oRes.rows[0].id;
      for (const item of cart.items) {
        const nameEn = item.product_name_en || item.product_name;
        const variantLabel = item.variant || item.unit_pack_size || null;
        const unitType = item.unit_type || 'pcs';
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name_en, product_variant, quantity, unit_type, unit_price, gst_percentage, gst_amount, subtotal, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [orderId, item.product_id, nameEn, variantLabel, item.quantity, unitType, item.unit_price, item.gst_percentage, item.item_gst, item.item_total, item.item_grand_total]
        );
        // Critical: Decrement stock atomically within transaction to prevent overselling
        let stockRes;
        if (item.unit_type === 'loose') {
          const kgPerUnit = parseVariantToKg(item.variant);
          if (kgPerUnit !== null) {
            const rootId = item.parent_product_id || item.product_id;
            const kgToDeduct = kgPerUnit * parseFloat(item.quantity);
            stockRes = await client.query(
              'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
              [kgToDeduct, rootId]
            );
          } else {
            stockRes = await client.query(
              'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
              [item.quantity, item.product_id]
            );
          }
        } else {
          stockRes = await client.query(
            'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
            [item.quantity, item.product_id]
          );
        }
        // Fail entire order if any item has insufficient stock (race condition protection)
        if (stockRes.rowCount === 0) {
          throw new Error(`Insufficient stock for "${item.product_name_en || item.product_name}". Please update your cart.`);
        }
      }
      // Insert free product as ₹0 order item when a free_item threshold promo was applied
      if (freeProductId) {
        const fpRes = await client.query(
          `SELECT p.id, p.unit_type, p.gst_percentage, COALESCE(pt.name, p.sku, 'Free Item') AS name_en
           FROM products p
           LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
           WHERE p.id = $1 AND p.is_active = TRUE LIMIT 1`,
          [freeProductId]
        );
        if (fpRes.rows.length > 0) {
          const fp = fpRes.rows[0];
          await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name_en, product_variant, quantity, unit_type, unit_price, gst_percentage, gst_amount, subtotal, total)
             VALUES ($1,$2,$3,NULL,1,$4,0,0,0,0,0)`,
            [orderId, freeProductId, fp.name_en, fp.unit_type || 'pcs']
          );
          // Do NOT decrement stock — free items are handled manually by the store
        }
      }
      // Clean up cart after successful order - user starts fresh
      const cartRow = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
      if (cartRow.rows.length) { await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRow.rows[0].id]); }
      return { orderId, orderNumber };
    });
  }
  static async updateStatus(id, status, notes = null) {
    const tsMap = { confirmed: 'confirmed_at', ready_for_pickup: 'ready_at', picked_up: 'picked_up_at', cancelled: 'cancelled_at' };
    let sql = 'UPDATE orders SET status = $1'; const params = [status]; let idx = 2;
    if (tsMap[status]) sql += `, ${tsMap[status]} = NOW()`;
    if (status === 'cancelled' && notes) { sql += `, cancellation_reason = $${idx++}`; params.push(notes); }
    sql += ` WHERE id = $${idx}`;
    params.push(id);
    return modify(sql, params);
  }
  static async cancel(id, reason = null) {
    return withTransaction(async (client) => {
      // 1. Fetch order to get promotion_id and items
      const orderRow = await client.query(
        'SELECT promotion_id FROM orders WHERE id = $1',
        [id]
      );
      const promotionId = orderRow.rows[0]?.promotion_id || null;
      const items = await client.query(
        `SELECT oi.product_id, oi.quantity, oi.unit_type,
                p.variant, p.parent_product_id
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`,
        [id]
      );
      // 2. Restore stock
      for (const item of items.rows) {
        if (item.unit_type === 'loose') {
          const kgPerUnit = parseVariantToKg(item.variant);
          if (kgPerUnit !== null) {
            const rootId = item.parent_product_id || item.product_id;
            const kgToRestore = kgPerUnit * parseFloat(item.quantity);
            await client.query(
              'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
              [kgToRestore, rootId]
            );
          } else {
            await client.query(
              'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
              [item.quantity, item.product_id]
            );
          }
        } else {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
      // 3. Unclaim deal slots so they become available again
      if (promotionId) {
        // Fetch promotion type to know how to unclaim
        const promoTypeRow = await client.query(
          'SELECT discount_type FROM promotions WHERE id = $1',
          [promotionId]
        );
        const discountType = promoTypeRow.rows[0]?.discount_type;

        if (discountType === 'flat') {
          // Flat = one deal slot was claimed on the FIRST qualifying product.
          // Decrement that one product; items_claimed by sum of ALL order quantities.
          const totalQtyRow = await client.query(
            `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total_qty
               FROM order_items oi
              WHERE oi.order_id = $1`,
            [id]
          );
          const totalQty = totalQtyRow.rows[0]?.total_qty || 0;
          await client.query(
            `UPDATE promotion_products pp
                SET deals_claimed = GREATEST(0, pp.deals_claimed - 1),
                    items_claimed = GREATEST(0, pp.items_claimed - $3)
              WHERE pp.promotion_id = $2
                AND pp.product_id = (
                  SELECT oi.product_id
                    FROM order_items oi
                   WHERE oi.order_id = $1
                     AND EXISTS (
                       SELECT 1 FROM promotion_products pp2
                       WHERE pp2.promotion_id = $2
                         AND pp2.product_id = oi.product_id
                     )
                   ORDER BY oi.product_id
                   LIMIT 1
                )`,
            [id, promotionId, totalQty]
          );
        } else {
          // Percentage = one deal slot per product — decrement each via JOIN.
          await client.query(
            `UPDATE promotion_products pp
                SET deals_claimed = GREATEST(0, pp.deals_claimed - 1),
                    items_claimed = GREATEST(0, pp.items_claimed - oi.quantity)
               FROM order_items oi
              WHERE oi.order_id     = $1
                AND pp.promotion_id = $2
                AND pp.product_id   = oi.product_id`,
            [id, promotionId]
          );
        }
      }
      // 4. Mark order as cancelled
      await client.query(
        `UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1 WHERE id = $2`,
        [reason, id]
      );
      return true;
    });
  }
  static async getStatistics(startDate = null, endDate = null) {
    const conds = ['1=1']; const params = []; let idx = 1;
    if (startDate) { conds.push(`created_at::date >= $${idx++}`); params.push(startDate); }
    if (endDate)   { conds.push(`created_at::date <= $${idx++}`); params.push(endDate); }
    return queryOne(
      `SELECT COUNT(*) AS total_orders,
         SUM(CASE WHEN status='pending'          THEN 1 ELSE 0 END) AS pending_orders,
         SUM(CASE WHEN status='confirmed'        THEN 1 ELSE 0 END) AS confirmed_orders,
         SUM(CASE WHEN status='ready_for_pickup' THEN 1 ELSE 0 END) AS ready_orders,
         SUM(CASE WHEN status='picked_up'        THEN 1 ELSE 0 END) AS completed_orders,
         SUM(CASE WHEN status='cancelled'        THEN 1 ELSE 0 END) AS cancelled_orders,
         SUM(CASE WHEN status='picked_up' THEN subtotal     ELSE 0 END) AS total_sales,
         SUM(CASE WHEN status='picked_up' THEN total_gst    ELSE 0 END) AS total_gst,
         SUM(CASE WHEN status='picked_up' THEN total_amount ELSE 0 END) AS total_revenue
       FROM orders WHERE ${conds.join(' AND ')}`,
      params
    );
  }
  static formatOrder(order) {
    return {
      id: order.id, order_number: order.order_number,
      user_id: order.user_id, customer_name: order.customer_name,
      customer_phone: order.customer_phone, customer_email: order.customer_email || null, user_type: order.user_type,
      status: order.status,
      subtotal: parseFloat(order.subtotal), total_gst: parseFloat(order.total_gst),
      total_amount: parseFloat(order.total_amount),
      promotion_id: order.promotion_id || null,
      promotion_discount: parseFloat(order.promotion_discount || 0),
      promotion_title: order.promotion_title || null,
      notes: order.notes,
      confirmed_at: order.confirmed_at, ready_at: order.ready_at,
      picked_up_at: order.picked_up_at, cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      created_at: order.created_at, updated_at: order.updated_at,
    };
  }
}
module.exports = Order;
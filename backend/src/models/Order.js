const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
const { generateOrderNumber } = require('../utils/helpers');

class Order {
  static async findById(id, lang = 'en') {
    const order = await queryOne(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.user_type
       FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
      [id]
    );
    if (order) { const items = await this.getOrderItems(id, lang); return { ...this.formatOrder(order), items }; }
    return null;
  }

  static async findByOrderNumber(orderNumber, lang = 'en') {
    const order = await queryOne(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.user_type
       FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_number = $1`,
      [orderNumber]
    );
    if (order) { const items = await this.getOrderItems(order.id, lang); return { ...this.formatOrder(order), items }; }
    return null;
  }

  static async getOrderItems(orderId, lang = 'en') {
    const items = await query(
      `SELECT oi.*, COALESCE(pt_req.name, oi.product_name_en) AS product_name
       FROM order_items oi
       LEFT JOIN product_translations pt_req ON oi.product_id = pt_req.product_id AND pt_req.lang_code = $2
       WHERE oi.order_id = $1`,
      [orderId, lang]
    );
    return items.map(i => ({
      id: i.id, product_id: i.product_id,
      product_name: i.product_name, product_name_en: i.product_name_en,
      quantity: i.quantity, unit_type: i.unit_type,
      unit_price: parseFloat(i.unit_price), gst_percentage: parseFloat(i.gst_percentage),
      gst_amount: parseFloat(i.gst_amount), subtotal: parseFloat(i.subtotal), total: parseFloat(i.total),
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
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.user_type
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    return { orders: rows.map(r => this.formatOrder(r)), total: parseInt(countRow.total, 10) };
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 10, status = null, userId = null, startDate = null, endDate = null } = options;
    const offset = (page - 1) * limit;
    const conds = ['1=1']; const params = []; let idx = 1;
    if (status)    { conds.push(`o.status = $${idx++}`);             params.push(status); }
    if (userId)    { conds.push(`o.user_id = $${idx++}`);            params.push(userId); }
    if (startDate) { conds.push(`o.created_at::date >= $${idx++}`);  params.push(startDate); }
    if (endDate)   { conds.push(`o.created_at::date <= $${idx++}`);  params.push(endDate); }
    const where = conds.join(' AND ');
    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, params);
    const rows = await query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.user_type
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    return { orders: rows.map(r => this.formatOrder(r)), total: parseInt(countRow.total, 10) };
  }

  static async createFromCart(userId, cart, notes = null) {
    return withTransaction(async (client) => {
      const orderNumber = generateOrderNumber();
      const oRes = await client.query(
        `INSERT INTO orders (user_id, order_number, status, subtotal, total_gst, total_amount, notes)
         VALUES ($1,$2,'pending',$3,$4,$5,$6) RETURNING id`,
        [userId, orderNumber, cart.subtotal, cart.total_gst, cart.total, notes]
      );
      const orderId = oRes.rows[0].id;
      for (const item of cart.items) {
        const nameEn = item.product_name_en || item.product_name;
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name_en, quantity, unit_type, unit_price, gst_percentage, gst_amount, subtotal, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [orderId, item.product_id, nameEn, item.quantity, item.unit_type, item.unit_price, item.gst_percentage, item.item_gst, item.item_total, item.item_grand_total]
        );
        const stockRes = await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
          [item.quantity, item.product_id]
        );
        if (stockRes.rowCount === 0) {
          throw new Error(`Insufficient stock for "${item.product_name_en || item.product_name}". Only limited quantity available — please update your cart.`);
        }
      }
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
      const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
      for (const item of items.rows) {
        await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
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
      customer_phone: order.customer_phone, user_type: order.user_type,
      status: order.status,
      subtotal: parseFloat(order.subtotal), total_gst: parseFloat(order.total_gst),
      total_amount: parseFloat(order.total_amount), notes: order.notes,
      confirmed_at: order.confirmed_at, ready_at: order.ready_at,
      picked_up_at: order.picked_up_at, cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      created_at: order.created_at, updated_at: order.updated_at,
    };
  }
}

module.exports = Order;

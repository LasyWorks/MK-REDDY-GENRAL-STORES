const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
const { getLocalizedField, generateOrderNumber } = require('../utils/helpers');

class Order {
  /**
   * Find order by ID
   */
  static async findById(id, lang = 'en') {
    const order = await queryOne(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (order) {
      const items = await this.getOrderItems(id, lang);
      return {
        ...this.formatOrder(order),
        items,
      };
    }
    return null;
  }

  /**
   * Find order by order number
   */
  static async findByOrderNumber(orderNumber, lang = 'en') {
    const order = await queryOne(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.order_number = ?`,
      [orderNumber]
    );

    if (order) {
      const items = await this.getOrderItems(order.id, lang);
      return {
        ...this.formatOrder(order),
        items,
      };
    }
    return null;
  }

  /**
   * Get order items
   */
  static async getOrderItems(orderId, lang = 'en') {
    const items = await query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    return items.map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: lang === 'te' && item.product_name_te ? item.product_name_te : item.product_name_en,
      product_name_en: item.product_name_en,
      product_name_te: item.product_name_te,
      quantity: item.quantity,
      unit_type: item.unit_type,
      unit_price: parseFloat(item.unit_price),
      gst_percentage: parseFloat(item.gst_percentage),
      gst_amount: parseFloat(item.gst_amount),
      subtotal: parseFloat(item.subtotal),
      total: parseFloat(item.total),
    }));
  }

  /**
   * Get orders for user
   */
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 10, status = null, lang = 'en' } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['o.user_id = ?'];
    let params = [userId];

    if (status) {
      whereConditions.push('o.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
      params
    );

    // Get orders (use inline LIMIT/OFFSET to avoid MySQL2 parameter issues)
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;
    const orders = await query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return {
      orders: orders.map(order => this.formatOrder(order)),
      total: countResult.total,
    };
  }

  /**
   * Get all orders (admin)
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 10, status = null, userId = null, startDate = null, endDate = null, lang = 'en' } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    let params = [];

    if (status) {
      whereConditions.push('o.status = ?');
      params.push(status);
    }

    if (userId) {
      whereConditions.push('o.user_id = ?');
      params.push(userId);
    }

    if (startDate) {
      whereConditions.push('DATE(o.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(o.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
      params
    );

    // Get orders (use inline LIMIT/OFFSET to avoid MySQL2 parameter issues)
    const safeLimit2 = parseInt(limit) || 10;
    const safeOffset2 = parseInt(offset) || 0;
    const orders = await query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.user_type
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ${safeLimit2} OFFSET ${safeOffset2}`,
      params
    );

    return {
      orders: orders.map(order => this.formatOrder(order)),
      total: countResult.total,
    };
  }

  /**
   * Create order from cart
   */
  static async createFromCart(userId, cart, notes = null) {
    return withTransaction(async (connection) => {
      const orderNumber = generateOrderNumber();

      // Create order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, order_number, status, subtotal, total_gst, total_amount, notes)
         VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
        [userId, orderNumber, cart.subtotal, cart.total_gst, cart.total, notes]
      );

      const orderId = orderResult.insertId;

      // Create order items and reduce stock
      for (const item of cart.items) {
        // Insert order item
        await connection.execute(
          `INSERT INTO order_items (
            order_id, product_id, product_name_en, product_name_te, quantity, 
            unit_type, unit_price, gst_percentage, gst_amount, subtotal, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, item.product_id, item.product_name, item.name_te || null,
            item.quantity, item.unit_type, item.unit_price, item.gst_percentage,
            item.item_gst, item.item_total, item.item_grand_total
          ]
        );

        // Reduce stock
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
          [item.quantity, item.product_id, item.quantity]
        );
      }

      // Clear cart
      const [cartData] = await connection.execute(
        'SELECT id FROM carts WHERE user_id = ?',
        [userId]
      );
      if (cartData.length > 0) {
        await connection.execute(
          'DELETE FROM cart_items WHERE cart_id = ?',
          [cartData[0].id]
        );
      }

      return {
        orderId,
        orderNumber,
      };
    });
  }

  /**
   * Update order status
   */
  static async updateStatus(id, status, notes = null) {
    const statusFields = {
      confirmed: 'confirmed_at',
      ready_for_pickup: 'ready_at',
      picked_up: 'picked_up_at',
      cancelled: 'cancelled_at',
    };

    let sql = 'UPDATE orders SET status = ?';
    const params = [status];

    if (statusFields[status]) {
      sql += `, ${statusFields[status]} = NOW()`;
    }

    if (status === 'cancelled' && notes) {
      sql += ', cancellation_reason = ?';
      params.push(notes);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    return modify(sql, params);
  }

  /**
   * Cancel order and restore stock
   */
  static async cancel(id, reason = null) {
    return withTransaction(async (connection) => {
      // Get order items
      const [items] = await connection.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      );

      // Restore stock
      for (const item of items) {
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      await connection.execute(
        `UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = ? WHERE id = ?`,
        [reason, id]
      );

      return true;
    });
  }

  /**
   * Get order statistics
   */
  static async getStatistics(startDate = null, endDate = null) {
    let whereConditions = ['1=1'];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');

    return queryOne(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
        SUM(CASE WHEN status = 'ready_for_pickup' THEN 1 ELSE 0 END) as ready_orders,
        SUM(CASE WHEN status = 'picked_up' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN status = 'picked_up' THEN subtotal ELSE 0 END) as total_sales,
        SUM(CASE WHEN status = 'picked_up' THEN total_gst ELSE 0 END) as total_gst,
        SUM(CASE WHEN status = 'picked_up' THEN total_amount ELSE 0 END) as total_revenue
       FROM orders
       WHERE ${whereClause}`,
      params
    );
  }

  /**
   * Format order object
   */
  static formatOrder(order) {
    return {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      user_type: order.user_type,
      status: order.status,
      subtotal: parseFloat(order.subtotal),
      total_gst: parseFloat(order.total_gst),
      total_amount: parseFloat(order.total_amount),
      notes: order.notes,
      pickup_time: order.pickup_time,
      confirmed_at: order.confirmed_at,
      ready_at: order.ready_at,
      picked_up_at: order.picked_up_at,
      cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }
}

module.exports = Order;

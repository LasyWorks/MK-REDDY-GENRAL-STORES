const { query, queryOne, modify } = require('../config/database');

class AdminNotification {
  /**
   * Create the admin_notifications table if it doesn't exist.
   * Called once at server startup.
   */
  static async ensureTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        type          VARCHAR(50)   NOT NULL,
        title         VARCHAR(255)  NOT NULL,
        message       TEXT,
        product_id    UUID          REFERENCES products(id) ON DELETE CASCADE,
        order_id      UUID          REFERENCES orders(id) ON DELETE CASCADE,
        stock_at_alert NUMERIC,
        is_read       BOOLEAN       NOT NULL DEFAULT FALSE,
        email_sent_at TIMESTAMPTZ,
        resolved_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    // Migrate existing tables: make email_sent_at nullable if it wasn't already
    await query(`ALTER TABLE admin_notifications ALTER COLUMN email_sent_at DROP NOT NULL`).catch(() => {});
    await query(`ALTER TABLE admin_notifications ALTER COLUMN email_sent_at DROP DEFAULT`).catch(() => {});
    await query(`ALTER TABLE admin_notifications ALTER COLUMN type TYPE VARCHAR(50)`).catch(() => {});
    await query(`ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE`).catch(() => {});
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_notif_product  ON admin_notifications(product_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_notif_order    ON admin_notifications(order_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_notif_unresolved ON admin_notifications(resolved_at) WHERE resolved_at IS NULL`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_notif_created  ON admin_notifications(created_at DESC)`);
  }

  /** Find the most recent unresolved notification for a product. */
  static async findUnresolved(productId) {
    return queryOne(
      `SELECT * FROM admin_notifications
       WHERE product_id = $1 AND resolved_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [productId]
    );
  }

  /** Find the most recent unresolved notification for an order + type. */
  static async findUnresolvedOrder(orderId, type = 'pending_order') {
    try {
      return queryOne(
        `SELECT * FROM admin_notifications
         WHERE order_id = $1 AND type = $2 AND resolved_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [orderId, type]
      );
    } catch (err) {
      if (err?.code === '42703' && String(err?.message || '').includes('order_id')) {
        return null;
      }
      throw err;
    }
  }

  /** Insert a new notification row (email_sent_at is NULL until email actually sends). */
  static async create({ type, title, message, productId, orderId, stockAtAlert }) {
    try {
      const rows = await query(
        `INSERT INTO admin_notifications (type, title, message, product_id, order_id, stock_at_alert)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [type, title, message || null, productId || null, orderId || null, stockAtAlert ?? null]
      );
      return rows[0];
    } catch (err) {
      if (err?.code === '42703' && String(err?.message || '').includes('order_id')) {
        const rows = await query(
          `INSERT INTO admin_notifications (type, title, message, product_id, stock_at_alert)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [type, title, message || null, productId || null, stockAtAlert ?? null]
        );
        return rows[0];
      }
      throw err;
    }
  }

  /** Insert a generic order-related notification for the admin bell. */
  static async createOrderNotification({ type = 'order', title, message, orderId = null }) {
    return this.create({
      type,
      title,
      message,
      productId: null,
      orderId,
      stockAtAlert: null,
    });
  }

  /** Set email_sent_at = NOW() after email is successfully delivered. */
  static async markEmailSent(id) {
    await modify(`UPDATE admin_notifications SET email_sent_at = NOW() WHERE id = $1`, [id]);
  }

  /** Bump email_sent_at to NOW() when resending after 3 days. */
  static async updateEmailSent(id) {
    await modify(`UPDATE admin_notifications SET email_sent_at = NOW() WHERE id = $1`, [id]);
  }

  /** Mark all open notifications for a product as resolved (stock restored). */
  static async resolveForProduct(productId) {
    await modify(
      `UPDATE admin_notifications SET resolved_at = NOW()
       WHERE product_id = $1 AND resolved_at IS NULL`,
      [productId]
    );
  }

  /** Mark all open notifications for an order as resolved (order moved forward). */
  static async resolveForOrder(orderId, type = null) {
    if (!orderId) return;
    try {
      if (type) {
        await modify(
          `UPDATE admin_notifications SET resolved_at = NOW()
           WHERE order_id = $1 AND type = $2 AND resolved_at IS NULL`,
          [orderId, type]
        );
        return;
      }
      await modify(
        `UPDATE admin_notifications SET resolved_at = NOW()
         WHERE order_id = $1 AND resolved_at IS NULL`,
        [orderId]
      );
    } catch (err) {
      if (err?.code === '42703' && String(err?.message || '').includes('order_id')) {
        return;
      }
      throw err;
    }
  }

  /**
   * Resolve issue notifications that are no longer active based on current data.
   * - low/out: resolve when stock is now above threshold
   * - pending_order: resolve when order moved beyond pending/confirmed
   */
  static async resolveCompletedIssues() {
    const stockResolved = await modify(
      `UPDATE admin_notifications n
       SET resolved_at = NOW()
       FROM products p
       LEFT JOIN products parent ON parent.id = p.parent_product_id
       WHERE n.product_id = p.id
         AND n.type IN ('low', 'out')
         AND n.resolved_at IS NULL
         AND (
           p.is_active = FALSE
           OR
           (
             CASE
               WHEN p.unit_type = 'loose' AND p.parent_product_id IS NOT NULL
                 THEN COALESCE(parent.stock_quantity, p.stock_quantity)
               ELSE p.stock_quantity
             END
             >
             CASE
               WHEN p.unit_type = 'loose' AND p.parent_product_id IS NOT NULL
                 THEN COALESCE(parent.low_stock_threshold, p.low_stock_threshold, 10)
               ELSE COALESCE(p.low_stock_threshold, 10)
             END
           )
         )`
    );

    let orderResolved = 0;
    try {
      orderResolved = await modify(
        `UPDATE admin_notifications n
         SET resolved_at = NOW()
         FROM orders o
         WHERE n.order_id = o.id
           AND n.type = 'pending_order'
           AND n.resolved_at IS NULL
           AND o.status NOT IN ('pending', 'confirmed')`
      );
    } catch (err) {
      if (!(err?.code === '42703' && String(err?.message || '').includes('order_id'))) {
        throw err;
      }
    }

    return {
      stockResolved,
      orderResolved,
      totalResolved: stockResolved + orderResolved,
    };
  }

  /** Delete all already-resolved issue notifications. */
  static async deleteResolvedIssues() {
    const deleted = await query(
      `DELETE FROM admin_notifications
       WHERE resolved_at IS NOT NULL
         AND type IN ('low', 'out', 'pending_order')
       RETURNING id`
    );
    return deleted.length;
  }

  /**
   * Return notifications for the admin bell:
    *   - Active issue notifications (low/out/pending_order) only while unresolved
    *   - Other notifications from the last 7 days
    * Sorted: newest first.
   */
  static async getForAdmin({ limit = 100 } = {}) {
    const rows = await query(
      `SELECT
         n.*,
         COALESCE(pt.name, p.sku, 'Unknown') AS product_name,
         p.stock_quantity                      AS current_stock,
         p.low_stock_threshold
       FROM admin_notifications n
       LEFT JOIN products p
              ON p.id = n.product_id
       LEFT JOIN product_translations pt
              ON pt.product_id = n.product_id AND pt.lang_code = 'en'
      WHERE n.type <> 'order_status'
      AND (
        n.type IN ('low', 'out', 'pending_order')
        AND n.resolved_at IS NULL
      )
      OR (
        n.type <> 'order_status'
        AND
        n.type NOT IN ('low', 'out', 'pending_order')
        AND n.created_at >= NOW() - INTERVAL '7 days'
      )
       ORDER BY n.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  /** Count unread notifications in the bell feed scope. */
  static async countUnread() {
    const row = await queryOne(
      `SELECT COUNT(*) AS cnt
       FROM admin_notifications
       WHERE is_read = FALSE
         AND (
           (type IN ('low', 'out', 'pending_order') AND resolved_at IS NULL)
           OR
           (type <> 'order_status' AND type NOT IN ('low', 'out', 'pending_order') AND created_at >= NOW() - INTERVAL '7 days')
         )`
    );
    return parseInt(row?.cnt ?? 0, 10);
  }

  /** Mark a single notification as read. */
  static async markRead(id) {
    await modify(`UPDATE admin_notifications SET is_read = TRUE WHERE id = $1`, [id]);
  }

  /** Mark every unread notification as read. */
  static async markAllRead() {
    await modify(`UPDATE admin_notifications SET is_read = TRUE WHERE is_read = FALSE`);
  }

  /** Delete all notifications from admin bell history. */
  static async deleteAll() {
    const deleted = await query(`DELETE FROM admin_notifications RETURNING id`);
    return deleted.length;
  }
}

module.exports = AdminNotification;

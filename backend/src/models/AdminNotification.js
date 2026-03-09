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
        type          VARCHAR(20)   NOT NULL,
        title         VARCHAR(255)  NOT NULL,
        message       TEXT,
        product_id    UUID          REFERENCES products(id) ON DELETE CASCADE,
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
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_notif_product  ON admin_notifications(product_id)`);
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

  /** Insert a new notification row (email_sent_at is NULL until email actually sends). */
  static async create({ type, title, message, productId, stockAtAlert }) {
    const rows = await query(
      `INSERT INTO admin_notifications (type, title, message, product_id, stock_at_alert)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, title, message || null, productId, stockAtAlert ?? null]
    );
    return rows[0];
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

  /**
   * Return notifications for the admin bell:
   *   - All unresolved ones
   *   - Resolved ones created within the last 7 days
   * Sorted: unresolved first, then by created_at desc.
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
       WHERE n.resolved_at IS NULL
          OR n.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY
         CASE WHEN n.resolved_at IS NULL THEN 0 ELSE 1 END,
         n.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  /** Count unread + unresolved notifications (badge number). */
  static async countUnread() {
    const row = await queryOne(
      `SELECT COUNT(*) AS cnt
       FROM admin_notifications
       WHERE is_read = FALSE AND resolved_at IS NULL`
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
}

module.exports = AdminNotification;

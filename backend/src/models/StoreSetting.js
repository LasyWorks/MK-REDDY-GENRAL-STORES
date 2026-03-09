const { query, queryOne, modify } = require("../config/database");

class StoreSetting {
  /**
   * Get all settings as key-value object
   */
  static async getAll() {
    const rows = await query(
      `SELECT key, value, label, description, updated_at FROM store_settings ORDER BY key`,
    );
    return rows;
  }

  /**
   * Get a single setting by key
   */
  static async get(key) {
    return queryOne(
      `SELECT key, value, label, description, updated_at FROM store_settings WHERE key = $1`,
      [key],
    );
  }

  /**
   * Get public settings (for cart/checkout — no label/description needed)
   */
  static async getPublic() {
    const rows = await query(
      `SELECT key, value FROM store_settings WHERE key IN (
        'min_order_amount', 'delivery_charge', 'handling_charge',
        'gst_enabled', 'gst_inclusive', 'retail_gst_rate', 'wholesale_gst_rate',
        'wholesale_discount_pct'
      )`,
    );
    const result = {};
    for (const row of rows) {
      result[row.key] = parseFloat(row.value) || 0;
    }
    return result;
  }

  /**
   * Get GST configuration settings with defaults
   */
  static async getGstConfig() {
    const rows = await query(
      `SELECT key, value FROM store_settings WHERE key IN (
        'gst_enabled', 'gst_inclusive', 'retail_gst_inclusive', 'retail_gst_rate', 'wholesale_gst_rate'
      )`,
    );
    const cfg = {
      gst_enabled: "1",          // default: GST enabled
      gst_inclusive: "0",        // fallback default: exclusive (add on top)
      retail_gst_inclusive: "1", // retail prices are MRP-inclusive (don't add GST on top)
      retail_gst_rate: "0",      // 0 = use per-product rate
      wholesale_gst_rate: "0",   // 0 = use per-product rate
    };
    for (const row of rows) cfg[row.key] = row.value;
    return cfg;
  }

  /**
   * Update a setting by key (upsert)
   */
  static async set(key, value) {
    const count = await modify(
      `INSERT INTO store_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, String(value)],
    );
    return count > 0;
  }

  /**
   * Bulk upsert multiple settings (inserts new keys, updates existing)
   */
  static async bulkSet(settings) {
    let updated = 0;
    for (const [key, value] of Object.entries(settings)) {
      const count = await modify(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)],
      );
      updated += count;
    }
    return updated;
  }
}

module.exports = StoreSetting;

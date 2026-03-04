const { query, queryOne, modify } = require("../config/database");

class StoreSetting {
  /**
   * Get all settings as key-value object
   */
  static async getAll() {
    const rows = await query(
      `SELECT key, value, label, description, updated_at FROM store_settings ORDER BY key`
    );
    return rows;
  }

  /**
   * Get a single setting by key
   */
  static async get(key) {
    return queryOne(
      `SELECT key, value, label, description, updated_at FROM store_settings WHERE key = $1`,
      [key]
    );
  }

  /**
   * Get public settings (for cart/checkout — no label/description needed)
   */
  static async getPublic() {
    const rows = await query(
      `SELECT key, value FROM store_settings WHERE key IN ('min_order_amount', 'delivery_charge', 'handling_charge')`
    );
    const result = {};
    for (const row of rows) {
      result[row.key] = parseFloat(row.value) || 0;
    }
    return result;
  }

  /**
   * Update a setting by key
   */
  static async set(key, value) {
    const count = await modify(
      `UPDATE store_settings SET value = $2, updated_at = NOW() WHERE key = $1`,
      [key, String(value)]
    );
    return count > 0;
  }

  /**
   * Bulk update multiple settings
   */
  static async bulkSet(settings) {
    // settings = { key1: value1, key2: value2, ... }
    let updated = 0;
    for (const [key, value] of Object.entries(settings)) {
      const count = await modify(
        `UPDATE store_settings SET value = $2, updated_at = NOW() WHERE key = $1`,
        [key, String(value)]
      );
      updated += count;
    }
    return updated;
  }
}

module.exports = StoreSetting;

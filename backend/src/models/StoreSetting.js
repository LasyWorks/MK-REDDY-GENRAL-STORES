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

  /**
   * Get dynamic voice dictionary for a language.
   * Stored as JSON string in store_settings key: voice_dict_<lang>
   */
  static async getVoiceDictionary(lang = "te") {
    const key = `voice_dict_${String(lang || "te").toLowerCase()}`;
    const row = await this.get(key);
    if (!row || !row.value) return {};

    try {
      const parsed = JSON.parse(row.value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  /**
   * Upsert dynamic voice dictionary for a language.
   */
  static async setVoiceDictionary(lang = "te", dict = {}) {
    const key = `voice_dict_${String(lang || "te").toLowerCase()}`;
    return this.set(key, JSON.stringify(dict));
  }

  /**
   * Build a Telugu->English dictionary from product translation rows.
   * Uses exact product pairs where both 'te' and 'en' names exist.
   */
  static async buildVoiceDictionaryFromProductTranslations() {
    const rows = await query(
      `SELECT LOWER(TRIM(pt_te.name)) AS te_name,
              LOWER(TRIM(pt_en.name)) AS en_name
       FROM product_translations pt_te
       JOIN product_translations pt_en
         ON pt_en.product_id = pt_te.product_id
        AND pt_en.lang_code = 'en'
      WHERE pt_te.lang_code = 'te'
        AND pt_te.name IS NOT NULL
        AND pt_en.name IS NOT NULL
        AND LENGTH(TRIM(pt_te.name)) > 0
        AND LENGTH(TRIM(pt_en.name)) > 0`,
    );

    const dict = {};
    for (const row of rows) {
      if (!row?.te_name || !row?.en_name) continue;
      dict[row.te_name] = row.en_name;
    }

    return dict;
  }
}

module.exports = StoreSetting;

const { query, queryOne, modify } = require('../config/database');

class SystemConfig {
  /**
   * Get config value by key
   */
  static async get(key) {
    const config = await queryOne(
      'SELECT config_value FROM system_config WHERE config_key = ? AND is_active = TRUE',
      [key]
    );
    return config ? config.config_value : null;
  }

  /**
   * Set config value
   */
  static async set(key, value, description = null) {
    const existing = await queryOne(
      'SELECT id FROM system_config WHERE config_key = ?',
      [key]
    );

    if (existing) {
      return modify(
        'UPDATE system_config SET config_value = ? WHERE config_key = ?',
        [value, key]
      );
    }

    return modify(
      'INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
      [key, value, description]
    );
  }

  /**
   * Get all configs
   */
  static async getAll() {
    const configs = await query(
      'SELECT * FROM system_config WHERE is_active = TRUE ORDER BY config_key'
    );

    return configs.reduce((acc, config) => {
      acc[config.config_key] = config.config_value;
      return acc;
    }, {});
  }

  /**
   * Bulk update configs
   */
  static async bulkUpdate(configs) {
    for (const [key, value] of Object.entries(configs)) {
      await this.set(key, value);
    }
    return true;
  }

  /**
   * Delete config
   */
  static async delete(key) {
    return modify('DELETE FROM system_config WHERE config_key = ?', [key]);
  }

  /**
   * Toggle config active status
   */
  static async toggleActive(key, isActive) {
    return modify(
      'UPDATE system_config SET is_active = ? WHERE config_key = ?',
      [isActive, key]
    );
  }
}

module.exports = SystemConfig;

const { query, queryOne, modify } = require('../config/database');

class SystemConfig {
  static async get(key) {
    const config = await queryOne(
      'SELECT config_value FROM system_config WHERE config_key = $1 AND is_active = TRUE', [key]
    );
    return config ? config.config_value : null;
  }

  static async set(key, value, description = null) {
    const existing = await queryOne('SELECT id FROM system_config WHERE config_key = $1', [key]);
    if (existing) {
      return modify('UPDATE system_config SET config_value = $1 WHERE config_key = $2', [value, key]);
    }
    return modify(
      'INSERT INTO system_config (config_key, config_value, description) VALUES ($1, $2, $3)',
      [key, value, description]
    );
  }

  static async getAll() {
    const configs = await query('SELECT * FROM system_config WHERE is_active = TRUE ORDER BY config_key');
    return configs.reduce((acc, c) => { acc[c.config_key] = c.config_value; return acc; }, {});
  }

  static async bulkUpdate(configs) {
    for (const [key, value] of Object.entries(configs)) await this.set(key, value);
    return true;
  }

  static async delete(key) {
    return modify('DELETE FROM system_config WHERE config_key = $1', [key]);
  }

  static async toggleActive(key, isActive) {
    return modify('UPDATE system_config SET is_active = $1 WHERE config_key = $2', [isActive, key]);
  }
}

module.exports = SystemConfig;

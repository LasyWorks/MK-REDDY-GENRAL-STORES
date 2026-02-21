const { query, queryOne, insert, modify } = require('../config/database');

class RefreshToken {
  static async create(userId, token, expiresAt, deviceInfo = null, ipAddress = null) {
    return insert(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, token, expiresAt, deviceInfo, ipAddress]
    );
  }

  static async findByToken(token) {
    return queryOne(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked = FALSE`,
      [token]
    );
  }

  static async revoke(id) {
    return modify('UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE id = $1', [id]);
  }

  static async revokeAllForUser(userId) {
    return modify('UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = $1', [userId]);
  }

  static async deleteExpired() {
    return modify('DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE');
  }

  static async countActiveForUser(userId) {
    const result = await queryOne(
      `SELECT COUNT(*) AS count FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() AND revoked = FALSE`,
      [userId]
    );
    return parseInt(result.count, 10);
  }
}

module.exports = RefreshToken;

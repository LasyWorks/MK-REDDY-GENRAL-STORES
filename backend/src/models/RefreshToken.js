const { query, queryOne, insert, modify } = require('../config/database');

class RefreshToken {
  /**
   * Create refresh token
   */
  static async create(userId, token, expiresAt, deviceInfo = null, ipAddress = null) {
    return insert(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, token, expiresAt, deviceInfo, ipAddress]
    );
  }

  /**
   * Find by token
   */
  static async findByToken(token) {
    return queryOne(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? AND expires_at > NOW() AND revoked = FALSE`,
      [token]
    );
  }

  /**
   * Revoke token
   */
  static async revoke(id) {
    return modify(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE id = ?',
      [id]
    );
  }

  /**
   * Revoke all user tokens
   */
  static async revokeAllForUser(userId) {
    return modify(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = ?',
      [userId]
    );
  }

  /**
   * Delete expired tokens
   */
  static async deleteExpired() {
    return modify('DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE');
  }

  /**
   * Count active tokens for user
   */
  static async countActiveForUser(userId) {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM refresh_tokens 
       WHERE user_id = ? AND expires_at > NOW() AND revoked = FALSE`,
      [userId]
    );
    return result.count;
  }
}

module.exports = RefreshToken;

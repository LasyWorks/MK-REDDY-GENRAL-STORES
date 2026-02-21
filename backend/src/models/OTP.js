const { query, queryOne, insert, modify } = require('../config/database');

class OTP {
  /**
   * Create (or replace) OTP for a phone+purpose
   */
  static async create(phone, otpHash, purpose = 'login', expiryMinutes = 5) {
    // Invalidate existing OTPs for same phone+purpose
    await modify(
      'DELETE FROM otps WHERE phone = $1 AND purpose = $2',
      [phone, purpose]
    );

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    return insert(
      'INSERT INTO otps (phone, otp_hash, purpose, expires_at) VALUES ($1, $2, $3, $4) RETURNING id',
      [phone, otpHash, purpose, expiresAt]
    );
  }

  /**
   * Find a valid (non-expired, not verified) OTP
   */
  static async findValid(phone, purpose = 'login') {
    return queryOne(
      `SELECT * FROM otps
       WHERE phone = $1 AND purpose = $2 AND expires_at > NOW() AND is_verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [phone, purpose]
    );
  }

  /**
   * Increment verification attempts
   */
  static async incrementAttempts(id) {
    return modify(
      'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
      [id]
    );
  }

  /**
   * Mark OTP as verified
   */
  static async markVerified(id) {
    return modify(
      'UPDATE otps SET is_verified = TRUE WHERE id = $1',
      [id]
    );
  }

  /**
   * Delete by ID
   */
  static async delete(id) {
    return modify('DELETE FROM otps WHERE id = $1', [id]);
  }

  /**
   * Delete expired OTPs (maintenance)
   */
  static async deleteExpired() {
    return modify('DELETE FROM otps WHERE expires_at < NOW()');
  }

  /**
   * Count OTPs sent for a phone in the last N seconds (resend cooldown)
   */
  static async countRecent(phone, windowSeconds = 30) {
    const result = await queryOne(
      `SELECT COUNT(*) AS count FROM otps
       WHERE phone = $1 AND created_at > NOW() - ($2 * INTERVAL '1 second')`,
      [phone, windowSeconds]
    );
    return parseInt(result.count, 10);
  }
}

module.exports = OTP;


const { query, queryOne, insert, modify } = require('../config/database');

class OTP {
  /**
   * Create new OTP
   */
  static async create(phone, otpHash, purpose = 'login', expiryMinutes = 5) {
    // First, invalidate any existing OTPs for this phone
    await modify(
      'DELETE FROM otps WHERE phone = ? AND purpose = ?',
      [phone, purpose]
    );

    // Create new OTP
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    return insert(
      'INSERT INTO otps (phone, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [phone, otpHash, purpose, expiresAt]
    );
  }

  /**
   * Find valid OTP by phone
   */
  static async findValid(phone, purpose = 'login') {
    return queryOne(
      `SELECT * FROM otps 
       WHERE phone = ? AND purpose = ? AND expires_at > NOW() AND is_verified = FALSE`,
      [phone, purpose]
    );
  }

  /**
   * Increment attempts
   */
  static async incrementAttempts(id) {
    return modify(
      'UPDATE otps SET attempts = attempts + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Mark OTP as verified
   */
  static async markVerified(id) {
    return modify(
      'UPDATE otps SET is_verified = TRUE WHERE id = ?',
      [id]
    );
  }

  /**
   * Delete OTP
   */
  static async delete(id) {
    return modify('DELETE FROM otps WHERE id = ?', [id]);
  }

  /**
   * Delete expired OTPs
   */
  static async deleteExpired() {
    return modify('DELETE FROM otps WHERE expires_at < NOW()');
  }

  /**
   * Check rate limit
   */
  static async checkRateLimit(phone, windowMinutes = 1) {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM otps 
       WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [phone, windowMinutes]
    );
    return result.count;
  }
}

module.exports = OTP;

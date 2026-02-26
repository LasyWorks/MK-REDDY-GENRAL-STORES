/**
 * Account Lockout Service
 * Protects against brute force attacks by temporarily locking accounts after failed login attempts
 */

const { query, queryOne, modify } = require('../config/database');
const securityConfig = require('../config/security');
const logger = require('./logger');
const { sendSecurityAlert } = require('./alerting');

class AccountLockout {
  /**
   * Record a failed login attempt
   * @param {string} identifier - Phone or email
   * @param {string} ipAddress - Request IP
   */
  static async recordFailedAttempt(identifier, ipAddress = null) {
    if (!securityConfig.accountLockout.enabled) return;

    const table = 'failed_login_attempts';
    
    // Get current attempts count
    const record = await queryOne(
      `SELECT attempts, locked_until FROM ${table} 
       WHERE identifier = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [identifier]
    );

    const attempts = (record?.attempts || 0) + 1;
    
    if (attempts >= securityConfig.accountLockout.maxFailedAttempts) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(
        lockoutUntil.getMinutes() + securityConfig.accountLockout.lockoutDurationMinutes
      );

      await modify(
        `INSERT INTO ${table} (identifier, attempts, locked_until, ip_address, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (identifier) DO UPDATE 
         SET attempts = $2, locked_until = $3, ip_address = $4, updated_at = NOW()`,
        [identifier, attempts, lockoutUntil, ipAddress]
      );

      logger.warn(`Account locked: ${identifier} after ${attempts} failed attempts from IP ${ipAddress}`);
      
      await sendSecurityAlert('ACCOUNT_LOCKED', {
        identifier,
        attempts,
        ipAddress,
        lockedUntil: lockoutUntil,
      });

      return { locked: true, lockedUntil: lockoutUntil };
    }

    await modify(
      `INSERT INTO ${table} (identifier, attempts, ip_address, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (identifier) DO UPDATE 
       SET attempts = $2, ip_address = $3, updated_at = NOW()`,
      [identifier, attempts, ipAddress]
    );

    return { locked: false, attemptsRemaining: securityConfig.accountLockout.maxFailedAttempts - attempts };
  }

  /**
   * Check if an account is currently locked
   * @param {string} identifier - Phone or email
   * @returns {Promise<{locked: boolean, lockedUntil: Date|null}>}
   */
  static async isLocked(identifier) {
    if (!securityConfig.accountLockout.enabled) {
      return { locked: false, lockedUntil: null };
    }

    const table = 'failed_login_attempts';
    const record = await queryOne(
      `SELECT locked_until FROM ${table} 
       WHERE identifier = $1 AND locked_until > NOW()`,
      [identifier]
    );

    if (record) {
      return { locked: true, lockedUntil: record.locked_until };
    }

    return { locked: false, lockedUntil: null };
  }

  /**
   * Reset failed attempts on successful login
   * @param {string} identifier - Phone or email
   */
  static async resetAttempts(identifier) {
    if (!securityConfig.accountLockout.enabled || !securityConfig.accountLockout.resetSuccessfulLogin) {
      return;
    }

    const table = 'failed_login_attempts';
    await modify(`DELETE FROM ${table} WHERE identifier = $1`, [identifier]);
  }

  /**
   * Manually unlock an account (admin action)
   * @param {string} identifier - Phone or email
   * @param {string} adminId - Admin who unlocked the account
   */
  static async unlock(identifier, adminId) {
    const table = 'failed_login_attempts';
    await modify(`DELETE FROM ${table} WHERE identifier = $1`, [identifier]);
    
    logger.info(`Account unlocked by admin: ${identifier} by admin ${adminId}`);
    
    await sendSecurityAlert('ACCOUNT_UNLOCKED', {
      identifier,
      adminId,
    });
  }
}

module.exports = AccountLockout;

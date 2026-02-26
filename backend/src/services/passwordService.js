/**
 * Change Password Service
 * Handles password changes with security features like JWT revocation
 */

const bcrypt = require('bcryptjs');
const { User, RefreshToken } = require('../models');
const ApiError = require('../utils/ApiError');
const securityConfig = require('../config/security');
const logger = require('../utils/logger');
const { sendSecurityAlert } = require('../utils/alerting');

class PasswordService {
  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    if (!user.password_hash) {
      throw ApiError.badRequest('No password set. Use forgot password flow.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < securityConfig.password.minLength) {
      throw ApiError.badRequest(`Password must be at least ${securityConfig.password.minLength} characters`);
    }

    // Don't allow same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw ApiError.badRequest('New password must be different from current password');
    }

    // Hash new password with secure work factor
    const newPasswordHash = await bcrypt.hash(newPassword, securityConfig.password.bcryptRounds);

    // Update password
    await User.update(userId, { password_hash: newPasswordHash });

    // JWT Revocation on Password Change: Revoke all refresh tokens
    if (securityConfig.jwtRevocation.revokeOnPasswordChange) {
      await RefreshToken.revokeAllForUser(userId);
      logger.info(`All refresh tokens revoked for user ${userId} due to password change`);
    }

    // Send security alert
    await sendSecurityAlert('ADMIN_PASSWORD_CHANGE', {
      userId,
      userName: user.name,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Password changed for user ${userId}`);

    return {
      success: true,
      message: 'Password changed successfully. Please log in again with your new password.',
      tokensRevoked: securityConfig.jwtRevocation.revokeOnPasswordChange,
    };
  }

  /**
   * Reset password (for forgot password flow)
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   */
  static async resetPassword(userId, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate new password
    if (newPassword.length < securityConfig.password.minLength) {
      throw ApiError.badRequest(`Password must be at least ${securityConfig.password.minLength} characters`);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, securityConfig.password.bcryptRounds);

    // Update password
    await User.update(userId, { password_hash: newPasswordHash });

    // Revoke all refresh tokens for security
    if (securityConfig.jwtRevocation.revokeOnPasswordChange) {
      await RefreshToken.revokeAllForUser(userId);
      logger.info(`All refresh tokens revoked for user ${userId} due to password reset`);
    }

    await sendSecurityAlert('PASSWORD_RESET', {
      userId,
      userName: user.name,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Password reset for user ${userId}`);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  /**
   * Set initial password (for users without password)
   * @param {string} userId - User ID
   * @param {string} password - New password
   */
  static async setPassword(userId, password) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.password_hash) {
      throw ApiError.badRequest('Password already set. Use change password instead.');
    }

    // Validate password
    if (password.length < securityConfig.password.minLength) {
      throw ApiError.badRequest(`Password must be at least ${securityConfig.password.minLength} characters`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, securityConfig.password.bcryptRounds);

    // Set password
    await User.update(userId, { password_hash: passwordHash });

    logger.info(`Password set for user ${userId}`);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }
}

module.exports = PasswordService;

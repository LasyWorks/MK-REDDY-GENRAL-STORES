const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const securityConfig = require('../config/security');
const { User, OTP, RefreshToken } = require('../models');
const { generateOTP, hashOTP, getRoleIdByUserType } = require('../utils/helpers');
const SmsService = require('./smsService');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const AccountLockout = require('../utils/accountLockout');
const { sendSecurityAlert } = require('../utils/alerting');
// Prevent OTP spam attacks by limiting resend frequency
const OTP_RESEND_COOLDOWN_SECS = 30; 
class AuthService {
  static async sendOTP(phone, purpose = 'login') {
    // Check if user is trying to request OTPs too quickly (potential abuse)
    const recentCount = await OTP.countRecent(phone, OTP_RESEND_COOLDOWN_SECS);
    if (recentCount > 0) {
      throw ApiError.tooManyRequests(
        `Please wait ${OTP_RESEND_COOLDOWN_SECS} seconds before requesting a new OTP.`
      );
    }
    const otp = generateOTP(6);
    // Never store plain OTP - hash it to protect users if database is compromised
    const hashedOTP = hashOTP(otp);
    await OTP.create(phone, hashedOTP, purpose, config.otp.expiryMinutes);
    const smsResult = await SmsService.sendOtp(phone, otp);
    if (config.env !== 'development' && !smsResult.success) {
      logger.warn(`OTP SMS delivery failure for ${phone}: ${smsResult.error}`);
    }
    return {
      message: 'OTP sent successfully',
      expiresIn: config.otp.expiryMinutes * 60,
      // Only reveal OTP in development for testing - never in production for security
      ...(config.env === 'development' && { otp }),
    };
  }
  static async sendOTPByEmail(email) {
    if (!email || !email.includes('@')) {
      throw ApiError.badRequest('Valid email address is required');
    }
    const user = await User.findByEmail(email);
    if (!user) {
      throw ApiError.notFound('No account found with this email address');
    }
    if (!user.phone) {
      throw ApiError.badRequest('No phone number associated with this account');
    }
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }
    if (user.is_blocked) {
      throw ApiError.forbidden(`Account is blocked: ${user.blocked_reason || 'Contact support'}`);
    }
    const result = await this.sendOTP(user.phone, 'login');
    return {
      ...result,
      phone: user.phone, 
      email: user.email,
    };
  }
  static async verifyCustomerOTP(phone, otp) {
    const otpRecord = await OTP.findValid(phone, 'login');
    if (!otpRecord) {
      throw ApiError.badRequest('OTP expired or not found');
    }
    // Prevent brute force attacks by limiting guess attempts per OTP
    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.delete(otpRecord.id);
      throw ApiError.tooManyRequests('Maximum OTP attempts exceeded. Please request a new OTP.');
    }
    const hashedOTP = hashOTP(otp);
    if (hashedOTP !== otpRecord.otp_hash) {
      await OTP.incrementAttempts(otpRecord.id);
      throw ApiError.badRequest('Invalid OTP');
    }
    await OTP.markVerified(otpRecord.id);
    await OTP.delete(otpRecord.id);
    let user = await User.findByPhone(phone);
    // User verified phone but hasn't registered yet - allow them to complete signup
    if (!user) {
      return {
        authenticated: false,
        requiresRegistration: true,
        phone,
      };
    }
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }
    if (user.is_blocked) {
      throw ApiError.forbidden(`Account is blocked: ${user.blocked_reason || 'Contact support'}`);
    }
    const tokens = await this.generateTokens(user);
    await User.updateLastLogin(user.id);
    return {
      authenticated: true,
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
  static async registerCustomer(userData) {
    const { name, phone, user_type, address } = userData;
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      throw ApiError.conflict('User with this phone number already exists');
    }
    const customerCount = await User.countCustomers();
    if (customerCount >= config.limits.maxCustomers) {
      throw ApiError.forbidden('Maximum customer limit reached. Please contact support.');
    }
    const roleId = await getRoleIdByUserType(user_type);
    const userId = await User.create({
      name,
      phone,
      user_type,
      role_id: roleId,
      address,
    });
    const user = await User.findById(userId);
    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
  static async adminLoginWithPassword(identifier, password, ipAddress = null) {
    // Check if account is locked
    const lockStatus = await AccountLockout.isLocked(identifier);
    if (lockStatus.locked) {
      throw ApiError.forbidden(
        `Account temporarily locked due to multiple failed login attempts. Try again after ${lockStatus.lockedUntil.toLocaleString()}`
      );
    }

    let user = null;
    if (identifier.includes('@')) {
      user = await User.findByEmail(identifier);
    } else {
      user = await User.findByPhone(identifier);
    }
    if (!user) {
      await AccountLockout.recordFailedAttempt(identifier, ipAddress);
      throw ApiError.unauthorized('Invalid credentials');
    }
    if (user.role_name !== 'admin') {
      await AccountLockout.recordFailedAttempt(identifier, ipAddress);
      throw ApiError.forbidden('Access denied');
    }
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }
    if (!user.password_hash) {
      throw ApiError.unauthorized('Password not set. Contact administrator.');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const lockResult = await AccountLockout.recordFailedAttempt(identifier, ipAddress);
      if (lockResult.locked) {
        throw ApiError.forbidden(
          `Account locked after ${securityConfig.accountLockout.maxFailedAttempts} failed attempts. Locked until ${lockResult.lockedUntil.toLocaleString()}`
        );
      }
      throw ApiError.unauthorized(`Invalid credentials. ${lockResult.attemptsRemaining} attempt(s) remaining.`);
    }

    // Reset failed attempts on successful login
    await AccountLockout.resetAttempts(identifier);

    const tokens = await this.generateTokens(user, null, ipAddress);
    await User.updateLastLogin(user.id);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
  static async adminLogin(email, phone) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }
    if (user.phone !== phone) {
      throw ApiError.unauthorized('Invalid credentials');
    }
    if (user.role_name !== 'admin') {
      throw ApiError.forbidden('Access denied');
    }
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }
    return this.sendOTP(phone, 'login');
  }
  static async verifyAdminOTP(email, phone, otp) {
    const user = await User.findByEmail(email);
    if (!user || user.phone !== phone || user.role_name !== 'admin') {
      throw ApiError.unauthorized('Invalid credentials');
    }
    const otpRecord = await OTP.findValid(phone, 'login');
    if (!otpRecord) {
      throw ApiError.badRequest('OTP expired or not found');
    }
    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.delete(otpRecord.id);
      throw ApiError.tooManyRequests('Maximum OTP attempts exceeded');
    }
    const hashedOTP = hashOTP(otp);
    if (hashedOTP !== otpRecord.otp_hash) {
      await OTP.incrementAttempts(otpRecord.id);
      throw ApiError.badRequest('Invalid OTP');
    }
    await OTP.delete(otpRecord.id);
    const tokens = await this.generateTokens(user);
    await User.updateLastLogin(user.id);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
  static async generateTokens(user, deviceInfo = null, ipAddress = null) {
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role_name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); 
    await RefreshToken.create(user.id, refreshToken, expiresAt, deviceInfo, ipAddress);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.expiresIn,
    };
  }
  static async refreshTokens(refreshToken, deviceInfo = null, ipAddress = null) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    if (!tokenRecord) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Check if token is within grace period (for rotation)
    const gracePeriodEnd = new Date(tokenRecord.revoked_at);
    gracePeriodEnd.setSeconds(gracePeriodEnd.getSeconds() + securityConfig.refreshToken.gracePeriodSeconds);
    
    if (tokenRecord.revoked && new Date() > gracePeriodEnd) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Refresh Token Rotation: Revoke old token and issue new one
    if (securityConfig.refreshToken.rotationEnabled) {
      // Mark old token as revoked (but keep for grace period)
      await RefreshToken.revoke(tokenRecord.id);
      
      logger.info(`Refresh token rotated for user ${user.id}`);
    }

    // Generate new tokens
    return this.generateTokens(user, deviceInfo, ipAddress);
  }
  static async logout(userId, refreshToken = null) {
    if (refreshToken) {
      const tokenRecord = await RefreshToken.findByToken(refreshToken);
      if (tokenRecord && tokenRecord.user_id === userId) {
        await RefreshToken.revoke(tokenRecord.id);
      }
    }
    return true;
  }
  static async logoutAll(userId) {
    await RefreshToken.revokeAllForUser(userId);
    return true;
  }
  static sanitizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      user_type: user.user_type,
      role: user.role_name,
      address: user.address,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }
}
module.exports = AuthService;

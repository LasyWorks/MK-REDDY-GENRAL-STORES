const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { User, OTP, RefreshToken } = require('../models');
const { generateOTP, hashOTP } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Send OTP to phone number
   */
  static async sendOTP(phone, purpose = 'login') {
    // Generate OTP
    const otp = generateOTP(6);
    const hashedOTP = hashOTP(otp);

    // Store OTP
    await OTP.create(phone, hashedOTP, purpose, config.otp.expiryMinutes);

    // In production, send OTP via SMS
    // For development, log the OTP
    if (config.env === 'development') {
      logger.info(`OTP for ${phone}: ${otp}`);
    } else {
      // TODO: Integrate SMS service
      // await SMSService.send(phone, `Your OTP is: ${otp}`);
      logger.info(`OTP sent to ${phone}`);
    }

    return {
      message: 'OTP sent successfully',
      expiresIn: config.otp.expiryMinutes * 60, // seconds
      // Only include OTP in development
      ...(config.env === 'development' && { otp }),
    };
  }

  /**
   * Verify OTP and login customer
   */
  static async verifyCustomerOTP(phone, otp) {
    // Find valid OTP
    const otpRecord = await OTP.findValid(phone, 'login');

    if (!otpRecord) {
      throw ApiError.badRequest('OTP expired or not found');
    }

    // Check max attempts
    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.delete(otpRecord.id);
      throw ApiError.tooManyRequests('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    // Verify OTP
    const hashedOTP = hashOTP(otp);
    if (hashedOTP !== otpRecord.otp_hash) {
      await OTP.incrementAttempts(otpRecord.id);
      throw ApiError.badRequest('Invalid OTP');
    }

    // Mark OTP as verified and delete
    await OTP.markVerified(otpRecord.id);
    await OTP.delete(otpRecord.id);

    // Find or return customer
    let user = await User.findByPhone(phone);

    if (!user) {
      // User doesn't exist, they need to register
      return {
        authenticated: false,
        requiresRegistration: true,
        phone,
      };
    }

    // Check if user is active
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }

    if (user.is_blocked) {
      throw ApiError.forbidden(`Account is blocked: ${user.blocked_reason || 'Contact support'}`);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await User.updateLastLogin(user.id);

    return {
      authenticated: true,
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Register new customer
   */
  static async registerCustomer(userData) {
    const { name, phone, user_type, address } = userData;

    // Check if user already exists
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      throw ApiError.conflict('User with this phone number already exists');
    }

    // Check customer limit
    const customerCount = await User.countCustomers();
    if (customerCount >= config.limits.maxCustomers) {
      throw ApiError.forbidden('Maximum customer limit reached. Please contact support.');
    }

    // Determine role based on user type
    const roleId = user_type === 'wholesale' ? 3 : 2; // 2: retail_customer, 3: wholesale_customer

    // Create user
    const userId = await User.create({
      name,
      phone,
      user_type,
      role_id: roleId,
      address,
    });

    const user = await User.findById(userId);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Admin login with email/phone and password
   */
  static async adminLoginWithPassword(identifier, password) {
    // Find admin user by email or phone
    let user = null;
    
    if (identifier.includes('@')) {
      user = await User.findByEmail(identifier);
    } else {
      user = await User.findByPhone(identifier);
    }

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check if admin
    if (user.role_name !== 'admin') {
      throw ApiError.forbidden('Access denied');
    }

    // Check if active
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }

    // Verify password
    if (!user.password_hash) {
      throw ApiError.unauthorized('Password not set. Contact administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await User.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Admin login with email and phone (OTP-based)
   */
  static async adminLogin(email, phone) {
    // Find admin user
    const user = await User.findByEmail(email);

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Verify phone matches
    if (user.phone !== phone) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check if admin
    if (user.role_name !== 'admin') {
      throw ApiError.forbidden('Access denied');
    }

    // Check if active
    if (!user.is_active) {
      throw ApiError.forbidden('Account is inactive');
    }

    // Send OTP for 2FA
    return this.sendOTP(phone, 'login');
  }

  /**
   * Verify admin OTP login
   */
  static async verifyAdminOTP(email, phone, otp) {
    // Find admin
    const user = await User.findByEmail(email);

    if (!user || user.phone !== phone || user.role_name !== 'admin') {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Verify OTP
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

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await User.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Generate access and refresh tokens
   */
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

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store refresh token
    await RefreshToken.create(user.id, refreshToken, expiresAt, deviceInfo, ipAddress);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshTokens(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Check if token exists and not revoked
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    if (!tokenRecord) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Revoke old token
    await RefreshToken.revoke(tokenRecord.id);

    // Generate new tokens
    return this.generateTokens(user);
  }

  /**
   * Logout - revoke refresh token
   */
  static async logout(userId, refreshToken = null) {
    if (refreshToken) {
      const tokenRecord = await RefreshToken.findByToken(refreshToken);
      if (tokenRecord && tokenRecord.user_id === userId) {
        await RefreshToken.revoke(tokenRecord.id);
      }
    }
    return true;
  }

  /**
   * Logout all devices
   */
  static async logoutAll(userId) {
    await RefreshToken.revokeAllForUser(userId);
    return true;
  }

  /**
   * Sanitize user object for response
   */
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

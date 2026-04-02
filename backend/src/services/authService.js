const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
const securityConfig = require("../config/security");
const { User, OTP, RefreshToken } = require("../models");
const {
  generateOTP,
  hashOTP,
  getRoleIdByUserType,
} = require("../utils/helpers");
const EmailService = require("./emailService");
const GoogleOAuthService = require("./GoogleOAuthService");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const AccountLockout = require("../utils/accountLockout");
const { sendSecurityAlert } = require("../utils/alerting");
// Prevent OTP spam attacks by limiting resend frequency
const OTP_RESEND_COOLDOWN_SECS = 30;
class AuthService {
  static normalizeDateOnly(value) {
    if (value === undefined || value === null || value === "") return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    if (!str) return null;
    return str.slice(0, 10);
  }

  static async enrichForProfileCompletion(user) {
    if (!user) return user;

    // For legacy users, backfill display_name from name once on login.
    if (!user.display_name && user.name) {
      await User.update(user.id, { display_name: user.name });
      user.display_name = user.name;
    }

    return user;
  }

  static getProfileCompletionMeta(user) {
    const isCustomer = user?.user_type === "retail" || user?.user_type === "wholesale";
    if (!isCustomer) {
      return {
        requiresProfileCompletion: false,
        missingProfileFields: [],
      };
    }

    const missingProfileFields = [];
    if (!user?.display_name) missingProfileFields.push("display_name");
    if (!user?.date_of_birth) missingProfileFields.push("date_of_birth");

    return {
      requiresProfileCompletion: missingProfileFields.length > 0,
      missingProfileFields,
    };
  }

  // Login user with Google account
  static async googleLogin(idToken, ipAddress = null) {
    // Verify the Google token and get user info
    const googleUser = await GoogleOAuthService.verifyIdToken(idToken);

    if (!googleUser.emailVerified) {
      throw ApiError.forbidden("Please verify your email with Google first");
    }

    // Normalize email so the lookup matches accounts created via email-OTP
    // (those are always stored lowercase).
    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Check if user exists by email, then fall back to google_id.
    // The account may have been created with a different primary email
    // (e.g. via phone-OTP) but later linked to this Google account.
    let user = await User.findByEmail(normalizedEmail);
    if (!user) {
      user = await User.findByGoogleId(googleUser.googleId);
    }

    // If still no match, they need to complete registration with phone number
    if (!user) {
      logger.info(`New Google user attempting login: ${normalizedEmail}`);
      return {
        authenticated: false,
        requiresRegistration: true,
        requiresPhone: true,
        googleData: {
          email: normalizedEmail,
          name: googleUser.name,
          picture: googleUser.picture,
          googleId: googleUser.googleId,
        },
      };
    }

    // User exists - perform security checks
    if (!user.is_active) {
      throw ApiError.forbidden("Account is inactive. Please contact support.");
    }

    if (user.is_blocked) {
      throw ApiError.forbidden(
        `Account is blocked: ${user.blocked_reason || "Contact support"}`,
      );
    }

    // Update Google ID if not set
    if (!user.google_id) {
      await User.updateGoogleId(user.id, googleUser.googleId);
    }

    // Refresh profile picture if Google provides a newer one
    if (googleUser.picture && googleUser.picture !== user.profile_picture) {
      await User.updateProfilePicture(user.id, googleUser.picture);
      user.profile_picture = googleUser.picture;
    }

    user = await this.enrichForProfileCompletion(user);

    // Generate tokens and log login
    const tokens = await this.generateTokens(user, null, ipAddress);
    await User.updateLastLogin(user.id);

    logger.info(`Successful Google login for user ${user.id} (${user.email})`);

    return {
      authenticated: true,
      user: this.sanitizeUser(user),
      ...this.getProfileCompletionMeta(user),
      ...tokens,
    };
  }

  // Complete registration for new Google users (needs phone number)
  static async completeGoogleRegistration(userData) {
    const { name, display_name, date_of_birth, phone, googleId, picture, user_type, address } = userData;
    // Normalize email consistently with the email-OTP registration path
    const email = (userData.email || "").toLowerCase().trim();

    // Validate required fields
    if (!email || !googleId || !phone || !name) {
      throw ApiError.badRequest(
        "Email, Google ID, phone number, and name are required",
      );
    }

    // If a user already exists with this email it means they registered via
    // email-OTP previously. Google OAuth proves email ownership, so link the
    // Google account to the existing user and log them in instead of rejecting.
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      if (!existingUserByEmail.is_active) {
        throw ApiError.forbidden("Account is inactive. Please contact support.");
      }
      if (existingUserByEmail.is_blocked) {
        throw ApiError.forbidden(
          `Account is blocked: ${existingUserByEmail.blocked_reason || "Contact support"}`,
        );
      }
      // Link Google ID if not already set
      if (!existingUserByEmail.google_id) {
        await User.updateGoogleId(existingUserByEmail.id, googleId);
      }
      if (picture && picture !== existingUserByEmail.profile_picture) {
        await User.updateProfilePicture(existingUserByEmail.id, picture);
        existingUserByEmail.profile_picture = picture;
      }
      const enrichedExistingUser = await this.enrichForProfileCompletion(existingUserByEmail);
      const tokens = await this.generateTokens(enrichedExistingUser);
      await User.updateLastLogin(existingUserByEmail.id);
      logger.info(
        `Linked Google account to existing email user ${existingUserByEmail.id} (${email})`,
      );
      return {
        isNewUser: false,
        user: this.sanitizeUser(enrichedExistingUser),
        ...this.getProfileCompletionMeta(enrichedExistingUser),
        ...tokens,
      };
    }

    // Check if phone number is already taken
    const existingUserByPhone = await User.findByPhone(phone);
    if (existingUserByPhone) {
      // Phone-only account (no email) → link Google account directly
      if (!existingUserByPhone.email) {
        await User.updateGoogleId(existingUserByPhone.id, googleId);
        await User.update(existingUserByPhone.id, {
          email,
          email_verified: true,
        });
        if (picture)
          await User.updateProfilePicture(existingUserByPhone.id, picture);
        const updatedUser = await User.findById(existingUserByPhone.id);
        const enrichedUpdatedUser = await this.enrichForProfileCompletion(updatedUser);
        const tokens = await this.generateTokens(updatedUser);
        logger.info(
          `Linked Google account to phone-only user ${updatedUser.id} (${phone})`,
        );
        return {
          isNewUser: false,
          user: this.sanitizeUser(enrichedUpdatedUser),
          ...this.getProfileCompletionMeta(enrichedUpdatedUser),
          ...tokens,
        };
      }
      // Different email → do NOT auto-merge; surface merge flow to the user
      if (existingUserByPhone.email !== email) {
        const MergeService = require("./mergeService");
        logger.info(
          `[AuthService] Phone conflict detected on Google registration — phone:${phone} existing:${existingUserByPhone.email} new:${email}`,
        );
        const mergeInfo = await MergeService.createSession({
          newEmail: email,
          existingUser: existingUserByPhone,
          phone,
          newUserData: {
            name,
            display_name,
            date_of_birth,
            googleId,
            picture,
            user_type: user_type || "retail",
            address,
          },
        });
        return {
          requiresMerge: true,
          existingMaskedEmail: mergeInfo.existingMaskedEmail,
          newMaskedEmail: mergeInfo.newMaskedEmail,
          mergeSessionId: mergeInfo.mergeSessionId,
          expiresInSeconds: mergeInfo.expiresInSeconds,
        };
      }
      // Same phone + same email is caught above (existingUserByEmail check) — guard only
      throw ApiError.conflict("User with this phone number already exists");
    }

    // Check customer limit
    const customerCount = await User.countCustomers();
    if (customerCount >= config.limits.maxCustomers) {
      throw ApiError.forbidden(
        "Maximum customer limit reached. Please contact support.",
      );
    }

    // Get role ID
    const roleId = await getRoleIdByUserType(user_type || "retail");

    // Create user with Google OAuth data
    const userId = await User.create({
      name,
      display_name,
      date_of_birth,
      phone,
      email,
      google_id: googleId,
      profile_picture: picture,
      user_type: user_type || "retail",
      role_id: roleId,
      address,
      email_verified: true, // Email is verified by Google
    });

    const user = await User.findById(userId);
    const enrichedUser = await this.enrichForProfileCompletion(user);
    const tokens = await this.generateTokens(enrichedUser);

    if (user?.email) {
      EmailService.sendWelcomeEmail(user.email, user.name)
        .catch((err) => logger.error('Welcome email failed (Google registration):', err));
    }

    logger.info(`New user registered via Google OAuth: ${user.id} (${email})`);

    return {
      isNewUser: true,
      user: this.sanitizeUser(enrichedUser),
      ...this.getProfileCompletionMeta(enrichedUser),
      ...tokens,
    };
  }


  static async sendOTPByEmail(email) {
    if (!email || !email.includes("@")) {
      throw ApiError.badRequest("Valid email address is required");
    }
    const user = await User.findByEmail(email);
    if (!user) {
      throw ApiError.notFound("No account found with this email address");
    }
    if (!user.phone) {
      throw ApiError.badRequest("No phone number associated with this account");
    }
    if (!user.is_active) {
      throw ApiError.forbidden("Account is inactive");
    }
    if (user.is_blocked) {
      throw ApiError.forbidden(
        `Account is blocked: ${user.blocked_reason || "Contact support"}`,
      );
    }

    // Check if user is trying to request OTPs too quickly (potential abuse)
    const recentCount = await OTP.countRecent(
      user.phone,
      OTP_RESEND_COOLDOWN_SECS,
    );
    if (recentCount > 0) {
      throw ApiError.tooManyRequests(
        `Please wait ${OTP_RESEND_COOLDOWN_SECS} seconds before requesting a new OTP.`,
      );
    }

    const otp = generateOTP(6);
    const hashedOTP = hashOTP(otp);
    await OTP.create(user.phone, hashedOTP, "login", config.otp.expiryMinutes);

    // Send OTP via email
    try {
      await EmailService.sendOTP(email, otp, user.name);
      logger.info(`OTP email sent successfully to ${email}`);
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}:`, error);
      throw ApiError.internal("Failed to send OTP email. Please try again.");
    }

    return {
      message: "OTP sent successfully to your email",
      expiresIn: config.otp.expiryMinutes * 60,
      phone: user.phone,
      email: user.email,
      // Only reveal OTP in development for testing
      ...(config.env === "development" && { otp }),
    };
  }

  // Send OTP code to customer's email for login or registration
  static async sendCustomerEmailOTP(email) {
    if (!email || !email.includes("@")) {
      throw ApiError.badRequest("Valid email address is required");
    }

    // Normalize email to lowercase for consistency
    email = email.toLowerCase().trim();

    // Check for rate limiting
    const recentCount = await OTP.countRecentByEmail(
      email,
      OTP_RESEND_COOLDOWN_SECS,
    );
    if (recentCount > 0) {
      throw ApiError.tooManyRequests(
        `Please wait ${OTP_RESEND_COOLDOWN_SECS} seconds before requesting a new OTP.`,
      );
    }

    // Check if user exists
    const user = await User.findByEmail(email);

    // If user exists, check account status
    if (user) {
      if (!user.is_active) {
        throw ApiError.forbidden("Account is inactive");
      }
      if (user.is_blocked) {
        throw ApiError.forbidden(
          `Account is blocked: ${user.blocked_reason || "Contact support"}`,
        );
      }
    }

    const otp = generateOTP(6);
    const hashedOTP = hashOTP(otp);
    await OTP.createByEmail(
      email,
      hashedOTP,
      "login",
      config.otp.expiryMinutes,
    );

    // Send OTP via email
    try {
      await EmailService.sendOTP(email, otp, user?.name || "User");
      logger.info(`Customer OTP email sent successfully to ${email}`);

      // Debug logging in development
      if (config.env === "development") {
        logger.debug(`OTP Generation Debug:
          Email: ${email}
          OTP: ${otp}
          Hashed: ${hashedOTP}
        `);
      }
    } catch (error) {
      logger.error(`Failed to send customer OTP email to ${email}:`, error);
      throw ApiError.internal("Failed to send OTP email. Please try again.");
    }

    return {
      message: "OTP sent successfully to your email",
      expiresIn: config.otp.expiryMinutes * 60,
      email,
      // Only reveal OTP in development for testing
      ...(config.env === "development" && { otp }),
    };
  }

  // Check if OTP code matches and login/register the customer
  static async verifyCustomerEmailOTP(email, otp) {
    // Normalize email to lowercase for consistency
    email = email.toLowerCase().trim();

    const otpRecord = await OTP.findValidByEmail(email, "login");

    if (!otpRecord) {
      throw ApiError.badRequest("OTP expired or not found");
    }

    // Prevent brute force attacks by limiting guess attempts per OTP
    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.delete(otpRecord.id);
      throw ApiError.tooManyRequests(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
      );
    }

    // Trim and convert to string to ensure consistency
    const cleanOTP = String(otp).trim();
    const hashedOTP = hashOTP(cleanOTP);

    // Debug logging in development
    if (config.env === "development") {
      logger.debug(`OTP Verification Debug:
        Email: ${email}
        Input OTP: "${otp}" (type: ${typeof otp})
        Cleaned OTP: "${cleanOTP}"
        Input Hash: ${hashedOTP}
        Stored Hash: ${otpRecord.otp_hash}
        Match: ${hashedOTP === otpRecord.otp_hash}
      `);
    }

    if (hashedOTP !== otpRecord.otp_hash) {
      await OTP.incrementAttempts(otpRecord.id);
      throw ApiError.badRequest("Invalid OTP");
    }

    await OTP.markVerified(otpRecord.id);
    await OTP.delete(otpRecord.id);

    let user = await User.findByEmail(email);

    // User verified email but hasn't registered yet - require phone number
    if (!user) {
      return {
        authenticated: false,
        requiresRegistration: true,
        requiresPhone: true,
        email,
      };
    }

    if (!user.is_active) {
      throw ApiError.forbidden("Account is inactive");
    }

    if (user.is_blocked) {
      throw ApiError.forbidden(
        `Account is blocked: ${user.blocked_reason || "Contact support"}`,
      );
    }

    user = await this.enrichForProfileCompletion(user);
    const tokens = await this.generateTokens(user);
    await User.updateLastLogin(user.id);

    return {
      authenticated: true,
      user: this.sanitizeUser(user),
      ...this.getProfileCompletionMeta(user),
      ...tokens,
    };
  }

  // Complete registration for new email users (needs phone number and name)
  static async completeEmailOTPRegistration(userData) {
    const { name, display_name, date_of_birth, phone, email, user_type, address } = userData;

    // Validate required fields - phone is mandatory
    if (!email || !phone || !name) {
      throw ApiError.badRequest("Email, phone number, and name are required");
    }

    // Check if user already exists by email
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      throw ApiError.conflict("User with this email already exists");
    }

    // Check if phone number is already taken
    const existingUserByPhone = await User.findByPhone(phone);
    if (existingUserByPhone) {
      // Different email → surface merge flow instead of hard error
      if (existingUserByPhone.email !== email) {
        const MergeService = require("./mergeService");
        logger.info(
          `[AuthService] Phone conflict detected on email-OTP registration — phone:${phone} existing:${existingUserByPhone.email} new:${email}`,
        );
        const mergeInfo = await MergeService.createSession({
          newEmail: email,
          existingUser: existingUserByPhone,
          phone,
          newUserData: {
            name,
            display_name,
            date_of_birth,
            user_type: user_type || "retail",
            address,
          },
        });
        return {
          requiresMerge: true,
          existingMaskedEmail: mergeInfo.existingMaskedEmail,
          newMaskedEmail: mergeInfo.newMaskedEmail,
          mergeSessionId: mergeInfo.mergeSessionId,
          expiresInSeconds: mergeInfo.expiresInSeconds,
        };
      }
      throw ApiError.conflict("User with this phone number already exists");
    }
    const validUserTypes = ["retail", "wholesale"];
    if (user_type && !validUserTypes.includes(user_type)) {
      throw ApiError.badRequest(
        `Invalid user type. Must be one of: ${validUserTypes.join(", ")}`,
      );
    }

    // Get role ID based on user type
    const roleId = await getRoleIdByUserType(user_type || "retail");

    // Create the user
    const userId = await User.create({
      name,
      display_name,
      date_of_birth,
      phone,
      email,
      user_type: user_type || "retail",
      role_id: roleId,
      address,
      email_verified: true, // Email is verified via OTP
    });

    const user = await User.findById(userId);

    // Generate tokens
    const enrichedUser = await this.enrichForProfileCompletion(user);
    const tokens = await this.generateTokens(enrichedUser);

    if (user?.email) {
      EmailService.sendWelcomeEmail(user.email, user.name)
        .catch((err) => logger.error('Welcome email failed (email OTP registration):', err));
    }

    logger.info(`New user registered via email OTP: ${email} (ID: ${userId})`);

    return {
      user: this.sanitizeUser(enrichedUser),
      ...this.getProfileCompletionMeta(enrichedUser),
      ...tokens,
    };
  }

  static async verifyCustomerOTP(phone, otp) {
    const otpRecord = await OTP.findValid(phone, "login");
    if (!otpRecord) {
      throw ApiError.badRequest("OTP expired or not found");
    }
    // Prevent brute force attacks by limiting guess attempts per OTP
    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.delete(otpRecord.id);
      throw ApiError.tooManyRequests(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
      );
    }
    const hashedOTP = hashOTP(otp);
    if (hashedOTP !== otpRecord.otp_hash) {
      await OTP.incrementAttempts(otpRecord.id);
      throw ApiError.badRequest("Invalid OTP");
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
      throw ApiError.forbidden("Account is inactive");
    }
    if (user.is_blocked) {
      throw ApiError.forbidden(
        `Account is blocked: ${user.blocked_reason || "Contact support"}`,
      );
    }
    user = await this.enrichForProfileCompletion(user);
    const tokens = await this.generateTokens(user);
    await User.updateLastLogin(user.id);
    return {
      authenticated: true,
      user: this.sanitizeUser(user),
      ...this.getProfileCompletionMeta(user),
      ...tokens,
    };
  }
  static async registerCustomer(userData) {
    const { name, display_name, date_of_birth, phone, user_type, address } = userData;
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      throw ApiError.conflict("User with this phone number already exists");
    }
    const customerCount = await User.countCustomers();
    if (customerCount >= config.limits.maxCustomers) {
      throw ApiError.forbidden(
        "Maximum customer limit reached. Please contact support.",
      );
    }
    const roleId = await getRoleIdByUserType(user_type);
    const userId = await User.create({
      name,
      display_name,
      date_of_birth,
      phone,
      user_type,
      role_id: roleId,
      address,
    });
    const user = await User.findById(userId);
    const enrichedUser = await this.enrichForProfileCompletion(user);
    const tokens = await this.generateTokens(enrichedUser);
    return {
      user: this.sanitizeUser(enrichedUser),
      ...this.getProfileCompletionMeta(enrichedUser),
      ...tokens,
    };
  }
  static async adminLoginWithPassword(identifier, password, ipAddress = null) {
    // Check if account is locked
    const lockStatus = await AccountLockout.isLocked(identifier);
    if (lockStatus.locked) {
      throw ApiError.forbidden(
        `Account temporarily locked due to multiple failed login attempts. Try again after ${lockStatus.lockedUntil.toLocaleString()}`,
      );
    }

    let user = null;
    if (identifier.includes("@")) {
      user = await User.findByEmail(identifier);
    } else {
      user = await User.findByPhone(identifier);
    }
    if (!user) {
      await AccountLockout.recordFailedAttempt(identifier, ipAddress);
      throw ApiError.unauthorized("Invalid credentials");
    }
    if (user.role_name !== "admin") {
      await AccountLockout.recordFailedAttempt(identifier, ipAddress);
      throw ApiError.forbidden("Access denied");
    }
    if (!user.is_active) {
      throw ApiError.forbidden("Account is inactive");
    }
    if (!user.password_hash) {
      throw ApiError.unauthorized("Password not set. Contact administrator.");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const lockResult = await AccountLockout.recordFailedAttempt(
        identifier,
        ipAddress,
      );
      if (lockResult.locked) {
        throw ApiError.forbidden(
          `Account locked after ${securityConfig.accountLockout.maxFailedAttempts} failed attempts. Locked until ${lockResult.lockedUntil.toLocaleString()}`,
        );
      }
      throw ApiError.unauthorized(
        `Invalid credentials. ${lockResult.attemptsRemaining} attempt(s) remaining.`,
      );
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

  static async verifyAdminOTP(email, phone, otp) {
    const user = await User.findByEmail(email);
    if (!user || user.phone !== phone || user.role_name !== "admin") {
      throw ApiError.unauthorized("Invalid credentials");
    }
    const otpRecord = await OTP.findValid(phone, "login");
    if (!otpRecord) {
      throw ApiError.badRequest("OTP expired or not found");
    }
    if (otpRecord.attempts >= config.otp.maxAttempts) {
      await OTP.delete(otpRecord.id);
      throw ApiError.tooManyRequests("Maximum OTP attempts exceeded");
    }
    const hashedOTP = hashOTP(otp);
    if (hashedOTP !== otpRecord.otp_hash) {
      await OTP.incrementAttempts(otpRecord.id);
      throw ApiError.badRequest("Invalid OTP");
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
      { expiresIn: config.jwt.expiresIn },
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn },
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create(
      user.id,
      refreshToken,
      expiresAt,
      deviceInfo,
      ipAddress,
    );
    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: config.jwt.expiresIn,
    };
  }
  static async refreshTokens(
    refreshToken,
    deviceInfo = null,
    ipAddress = null,
  ) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      throw ApiError.unauthorized("Invalid refresh token");
    }
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    if (!tokenRecord) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    // Check if token is within grace period (for rotation)
    const gracePeriodEnd = new Date(tokenRecord.revoked_at);
    gracePeriodEnd.setSeconds(
      gracePeriodEnd.getSeconds() +
        securityConfig.refreshToken.gracePeriodSeconds,
    );

    if (tokenRecord.revoked && new Date() > gracePeriodEnd) {
      throw ApiError.unauthorized("Refresh token has been revoked");
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized("User not found or inactive");
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
      display_name: user.display_name,
      date_of_birth: this.normalizeDateOnly(user.date_of_birth),
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      email: user.email,
      profile_picture: user.profile_picture,
      user_type: user.user_type,
      role: user.role_name,
      address: user.address,
      is_active: user.is_active,
      is_super_admin: user.is_super_admin === true || user.is_super_admin === 1,
      email_verified: user.email_verified,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }
}
module.exports = AuthService;

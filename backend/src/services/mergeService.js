/**
 * MergeService  –  End-to-end account-merge business logic
 *
 * Flow overview
 * ─────────────
 *  1.  authService detects phone conflict → calls createSession()    →  returns mergeSessionId
 *  2.  Client calls sendOTPs()            →  OTPs sent to both emails
 *  3.  Client calls verifyOTP() twice     →  one call per side
 *  4.  When both sides are verified       →  executeMerge() is called automatically
 *  5.  executeMerge() returns JWT tokens  →  client is logged in as the primary user
 *
 * Security
 * ────────
 *  • Sessions expire in 15 minutes
 *  • OTPs expire in 5 minutes, max 5 attempts, single-use
 *  • Rate-limit: 3 sessions per email per hour checked externally (authRoutes)
 *  • All actions written to merge_audit_log (immutable)
 *  • Emails are masked before leaving the server
 */
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const config  = require('../config');
const { pool }             = require('../config/database');
const { User, RefreshToken }          = require('../models');
const { MergeSession, MergeOTP, LinkedIdentity, MergeAudit } = require('../models/MergeSession');
const EmailService = require('./emailService');
const ApiError     = require('../utils/ApiError');
const logger       = require('../utils/logger');
const { generateOTP, hashOTP } = require('../utils/helpers');

// Re-use the same token generation helper as AuthService to keep behaviour identical
const MERGE_OTP_EXPIRY_MINUTES = 5;
const MERGE_SESSION_EXPIRY_MINUTES = 15;

class MergeService {
  /* ─────────────────────────────────────────────────────────────────
     Helpers
  ───────────────────────────────────────────────────────────────── */

  /**
   * Mask an email address so "user@example.com" becomes "us**@example.com"
   * without revealing whether the account exists (§ Security Rule 1).
   */
  static maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    const shown = local.slice(0, Math.min(2, local.length));
    return `${shown}${'*'.repeat(Math.max(0, local.length - shown.length))}@${domain}`;
  }

  /** Build JWT access + refresh tokens (mirrors AuthService.generateTokens). */
  static async _generateTokens(user, ipAddress = null) {
    const payload = {
      id:        user.id,
      email:     user.email,
      phone:     user.phone,
      user_type: user.user_type,
      role_name: user.role_name,
    };

    const accessToken  = jwt.sign(payload, config.jwt.secret,  { expiresIn: config.jwt.expiresIn  });
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000); // 30 days
    await RefreshToken.create(user.id, refreshToken, expiresAt, null, ipAddress);

    return { accessToken, refreshToken };
  }

  /** Minimal safe user representation (mirrors AuthService.sanitizeUser). */
  static _sanitizeUser(user) {
    const { password_hash, ...safe } = user;   // eslint-disable-line no-unused-vars
    return safe;
  }

  /* ─────────────────────────────────────────────────────────────────
     1. createSession
        Called by authService when a phone conflict is detected BEFORE
        any merge UI is shown.  Creates the session row and returns just
        enough info for the frontend to start the flow.
  ───────────────────────────────────────────────────────────────── */
  static async createSession({ newEmail, existingUser, phone, newUserData = {}, ipAddress = null }) {
    newEmail = newEmail.toLowerCase().trim();

    // Rate-limit: no more than 3 pending sessions per new_email per hour
    const recent = await MergeSession.countRecent(newEmail, 60);
    if (recent >= 3) {
      logger.warn(`[MergeService] Rate-limit hit for ${newEmail}`);
      await MergeAudit.log({
        mergeSessionId: null,
        primaryUserId:  existingUser.id,
        existingEmail:  existingUser.email,
        newEmail,
        phone,
        action:    'suspicious_attempt',
        detail:    { reason: 'rate_limit_exceeded', recent },
        ipAddress,
      });
      throw ApiError.tooManyRequests('Too many merge attempts. Please try again later.');
    }

    const sessionId = await MergeSession.create({
      newEmail,
      existingUserId: existingUser.id,
      phone,
      newUserData,
      ipAddress,
      expiryMinutes: MERGE_SESSION_EXPIRY_MINUTES,
    });

    await MergeAudit.log({
      mergeSessionId: sessionId,
      primaryUserId:  existingUser.id,
      existingEmail:  existingUser.email,
      newEmail,
      phone,
      action:    'session_created',
      detail:    { newUserData: { name: newUserData.name, user_type: newUserData.user_type } },
      ipAddress,
    });

    logger.info(`[MergeService] Session ${sessionId} created — phone ${phone} conflict between ${existingUser.email} and ${newEmail}`);

    return {
      mergeSessionId:      sessionId,
      existingMaskedEmail: MergeService.maskEmail(existingUser.email),
      newMaskedEmail:      MergeService.maskEmail(newEmail),
      expiresInSeconds:    MERGE_SESSION_EXPIRY_MINUTES * 60,
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     2. sendOTPs
        Sends independent OTPs to both email addresses.
        Can be called again to resend (OTPs are replaced atomically).
  ───────────────────────────────────────────────────────────────── */
  static async sendOTPs({ mergeSessionId, ipAddress = null }) {
    const session = await MergeSession.findById(mergeSessionId);
    if (!session) {
      throw ApiError.notFound('Merge session not found or has expired. Please restart registration.');
    }
    if (['completed', 'cancelled'].includes(session.status)) {
      throw ApiError.badRequest(`Merge session has already been ${session.status}.`);
    }

    const existingUser = await User.findById(session.existing_user_id);
    if (!existingUser) {
      throw ApiError.notFound('Existing account not found. Please contact support.');
    }

    const newEmail      = session.new_email;
    const existingEmail = existingUser.email;

    // Generate two independent OTPs
    const primaryOTP   = generateOTP(6);
    const secondaryOTP = generateOTP(6);

    await Promise.all([
      MergeOTP.create({
        mergeSessionId,
        email:       newEmail,
        side:        'primary',
        otpHash:     hashOTP(primaryOTP),
        expiryMinutes: MERGE_OTP_EXPIRY_MINUTES,
      }),
      MergeOTP.create({
        mergeSessionId,
        email:       existingEmail,
        side:        'secondary',
        otpHash:     hashOTP(secondaryOTP),
        expiryMinutes: MERGE_OTP_EXPIRY_MINUTES,
      }),
    ]);

    // Send emails (fire-and-forget logging; hard-fail on both failing)
    const emailResults = await Promise.allSettled([
      EmailService.sendMergeOTP(newEmail,      primaryOTP,   'Your New Account', true),
      EmailService.sendMergeOTP(existingEmail, secondaryOTP, existingUser.name || 'Customer', false),
    ]);

    const allSent = emailResults.every((r) => r.status === 'fulfilled');
    if (!allSent) {
      const failed = emailResults
        .filter((r) => r.status === 'rejected')
        .map((r) => r.reason?.message);
      logger.error(`[MergeService] OTP email failures for session ${mergeSessionId}:`, failed);
      throw ApiError.internal('Failed to send verification emails. Please try again.');
    }

    await MergeAudit.log({
      mergeSessionId,
      primaryUserId: existingUser.id,
      existingEmail,
      newEmail,
      phone:     session.phone,
      action:    'otps_sent',
      detail:    { to: [MergeService.maskEmail(newEmail), MergeService.maskEmail(existingEmail)] },
      ipAddress,
    });

    // Expose plain OTPs in development for easy testing
    const devPayload = config.env === 'development'
      ? { _dev_primary_otp: primaryOTP, _dev_secondary_otp: secondaryOTP }
      : {};

    return {
      message:          'Verification emails sent to both accounts.',
      expiresInSeconds: MERGE_OTP_EXPIRY_MINUTES * 60,
      ...devPayload,
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     3. verifyOTP
        Validates one side's OTP.  If BOTH sides are now verified,
        automatically executes the merge and returns JWT tokens.
  ───────────────────────────────────────────────────────────────── */
  static async verifyOTP({ mergeSessionId, side, otp, ipAddress = null }) {
    if (!['primary', 'secondary'].includes(side)) {
      throw ApiError.badRequest('Invalid side.  Must be "primary" or "secondary".');
    }

    const session = await MergeSession.findById(mergeSessionId);
    if (!session) {
      throw ApiError.notFound('Merge session not found or has expired. Please restart registration.');
    }
    if (['completed', 'cancelled'].includes(session.status)) {
      throw ApiError.badRequest(`Merge session has already been ${session.status}.`);
    }

    // Prevent re-verifying an already-verified side
    if (side === 'primary'   && session.primary_otp_verified)   {
      return { side, alreadyVerified: true, bothVerified: session.secondary_otp_verified };
    }
    if (side === 'secondary' && session.secondary_otp_verified) {
      return { side, alreadyVerified: true, bothVerified: session.primary_otp_verified };
    }

    const otpRecord = await MergeOTP.findValid({ mergeSessionId, side });
    if (!otpRecord) {
      throw ApiError.badRequest('Verification code has expired or was not found. Please request new codes.');
    }

    // Brute-force guard
    if (otpRecord.attempts >= MergeOTP.MAX_ATTEMPTS) {
      await MergeOTP.deleteForSession(mergeSessionId);
      await MergeSession.cancel(mergeSessionId);
      throw ApiError.tooManyRequests('Too many incorrect attempts. Merge cancelled. Please restart registration.');
    }

    const inputHash = hashOTP(String(otp).trim());
    if (inputHash !== otpRecord.otp_hash) {
      await MergeOTP.incrementAttempts(otpRecord.id);
      const remaining = MergeOTP.MAX_ATTEMPTS - (otpRecord.attempts + 1);
      throw ApiError.badRequest(`Incorrect code. ${remaining} attempt(s) remaining.`);
    }

    // Mark OTP consumed (single-use)
    await MergeOTP.markVerified(otpRecord.id);

    // Update session state
    const existingUser = await User.findById(session.existing_user_id);
    if (side === 'primary') {
      await MergeSession.markPrimaryVerified(mergeSessionId);
      await MergeAudit.log({
        mergeSessionId,
        primaryUserId: existingUser.id,
        existingEmail: existingUser.email,
        newEmail:      session.new_email,
        phone:         session.phone,
        action:        'primary_otp_verified',
        ipAddress,
      });
    } else {
      await MergeSession.markSecondaryVerified(mergeSessionId);
      await MergeAudit.log({
        mergeSessionId,
        primaryUserId: existingUser.id,
        existingEmail: existingUser.email,
        newEmail:      session.new_email,
        phone:         session.phone,
        action:        'secondary_otp_verified',
        ipAddress,
      });
    }

    // Reload session to get freshest flags
    const updatedSession = await MergeSession.findById(mergeSessionId);
    const bothVerified   = updatedSession
      ? (updatedSession.primary_otp_verified && updatedSession.secondary_otp_verified)
      : (session.primary_otp_verified || session.secondary_otp_verified);  // fallback

    if (bothVerified) {
      // Auto-execute merge and return tokens
      const mergeResult = await MergeService.executeMerge({ mergeSessionId, ipAddress });
      return { side, verified: true, bothVerified: true, ...mergeResult };
    }

    return {
      side,
      verified:     true,
      bothVerified: false,
      message:      `${side === 'primary' ? 'Your' : 'The other'} email verified. Please verify the ${side === 'primary' ? 'existing account' : 'other'} email now.`,
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     4. executeMerge  (internal – called automatically by verifyOTP)
        Performs the atomic merge inside a DB transaction.
  ───────────────────────────────────────────────────────────────── */
  static async executeMerge({ mergeSessionId, ipAddress = null }) {
    const session = await MergeSession.findById(mergeSessionId);
    if (!session) {
      throw ApiError.notFound('Merge session not found or has expired.');
    }
    if (!session.primary_otp_verified || !session.secondary_otp_verified) {
      throw ApiError.badRequest('Both OTPs must be verified before merging.');
    }

    const existingUser = await User.findById(session.existing_user_id);
    if (!existingUser) {
      throw ApiError.notFound('Primary account not found.');
    }
    if (!existingUser.is_active) throw ApiError.forbidden('Primary account is inactive.');
    if (existingUser.is_blocked)  throw ApiError.forbidden(`Primary account is blocked: ${existingUser.blocked_reason || 'Contact support'}`);

    const newUserData = typeof session.new_user_data === 'string'
      ? JSON.parse(session.new_user_data)
      : (session.new_user_data || {});

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      /* a) Link the new email to the existing (primary) user */
      await client.query(
        `INSERT INTO linked_identities (primary_user_id, linked_email)
         VALUES ($1, $2)
         ON CONFLICT (linked_email) DO NOTHING`,
        [existingUser.id, session.new_email]
      );

      /* b) If the new account had Google OAuth data and primary doesn't, backfill it */
      const updates = [];
      if (newUserData.googleId && !existingUser.google_id) {
        updates.push(`google_id = '${newUserData.googleId}'`);
      }
      if (newUserData.picture && !existingUser.profile_picture) {
        updates.push(`profile_picture = '${newUserData.picture}'`);
      }
      if (updates.length) {
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $1`,
          [existingUser.id]
        );
      }

      /* c) Seal the session */
      await client.query(
        `UPDATE merge_sessions SET status = 'completed' WHERE id = $1`,
        [mergeSessionId]
      );

      /* d) Audit entry */
      await client.query(
        `INSERT INTO merge_audit_log
           (merge_session_id, primary_user_id, existing_email, new_email, phone, action, detail, ip_address)
         VALUES ($1,$2,$3,$4,$5,'merge_completed',$6,$7)`,
        [
          mergeSessionId,
          existingUser.id,
          existingUser.email,
          session.new_email,
          session.phone,
          JSON.stringify({ preservedFields: ['orders', 'cart', 'profile', 'google_id'] }),
          ipAddress,
        ]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`[MergeService] executeMerge transaction failed for session ${mergeSessionId}:`, err);
      await MergeAudit.log({
        mergeSessionId,
        primaryUserId: existingUser.id,
        existingEmail: existingUser.email,
        newEmail:      session.new_email,
        phone:         session.phone,
        action:        'merge_failed',
        detail:        { error: err.message },
        ipAddress,
      });
      throw ApiError.internal('Merge failed due to a server error. Please contact support.');
    } finally {
      client.release();
    }

    // Reload user to pick up any updated fields
    const freshUser  = await User.findById(existingUser.id);
    await User.updateLastLogin(freshUser.id);

    const tokens = await MergeService._generateTokens(freshUser, ipAddress);

    logger.info(`[MergeService] Merge completed — session ${mergeSessionId}; primary user ${freshUser.id}`);

    return {
      merged:        true,
      user:          MergeService._sanitizeUser(freshUser),
      accessToken:   tokens.accessToken,
      refreshToken:  tokens.refreshToken,
      message:       'Accounts merged successfully! You are now logged in.',
    };
  }

  /* ─────────────────────────────────────────────────────────────────
     5. cancelSession
  ───────────────────────────────────────────────────────────────── */
  static async cancelSession({ mergeSessionId, ipAddress = null }) {
    const session = await MergeSession.findById(mergeSessionId);
    if (!session) return { cancelled: true }; // already gone / expired – idempotent

    const existingUser = await User.findById(session.existing_user_id).catch(() => null);

    await MergeSession.cancel(mergeSessionId);
    await MergeOTP.deleteForSession(mergeSessionId);

    if (existingUser) {
      await MergeAudit.log({
        mergeSessionId,
        primaryUserId: existingUser.id,
        existingEmail: existingUser.email,
        newEmail:      session.new_email,
        phone:         session.phone,
        action:        'merge_cancelled',
        ipAddress,
      });
    }

    logger.info(`[MergeService] Session ${mergeSessionId} cancelled`);
    return { cancelled: true };
  }
}

module.exports = MergeService;

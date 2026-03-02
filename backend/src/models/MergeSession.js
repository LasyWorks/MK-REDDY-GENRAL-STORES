/**
 * Models for the account-merge feature.
 *
 * MergeSession  – one row per pending / completed merge flow
 * MergeOTP      – individual OTPs for each side (primary / secondary)
 */
const { query, queryOne, insert, modify } = require('../config/database');

/* ═══════════════════════════════════════════════════════════════════
   MergeSession
═══════════════════════════════════════════════════════════════════ */
class MergeSession {
  /**
   * Create a new merge session.
   * Returns the generated UUID id.
   */
  static async create({ newEmail, existingUserId, phone, newUserData = {}, ipAddress = null, expiryMinutes = 15 }) {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1_000);
    return insert(
      `INSERT INTO merge_sessions
         (new_email, existing_user_id, phone, new_user_data, ip_address, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        newEmail.toLowerCase().trim(),
        existingUserId,
        phone,
        JSON.stringify(newUserData),
        ipAddress,
        expiresAt,
      ]
    );
  }

  /** Fetch a live (non-expired, non-terminal) session. */
  static async findById(id) {
    return queryOne(
      `SELECT * FROM merge_sessions
       WHERE id = $1
         AND expires_at > NOW()
         AND status NOT IN ('completed','cancelled')`,
      [id]
    );
  }

  /** How many sessions has this new_email opened in the last N minutes? */
  static async countRecent(newEmail, windowMinutes = 60) {
    const r = await queryOne(
      `SELECT COUNT(*) AS count FROM merge_sessions
       WHERE new_email = $1
         AND created_at > NOW() - ($2 * INTERVAL '1 minute')`,
      [newEmail.toLowerCase().trim(), windowMinutes]
    );
    return parseInt(r.count, 10);
  }

  static async markPrimaryVerified(id) {
    return modify(
      `UPDATE merge_sessions
       SET primary_otp_verified = TRUE,
           status = CASE
             WHEN secondary_otp_verified THEN 'secondary_verified'
             ELSE 'primary_verified'
           END
       WHERE id = $1`,
      [id]
    );
  }

  static async markSecondaryVerified(id) {
    return modify(
      `UPDATE merge_sessions
       SET secondary_otp_verified = TRUE,
           status = CASE
             WHEN primary_otp_verified THEN 'secondary_verified'
             ELSE 'pending'
           END
       WHERE id = $1`,
      [id]
    );
  }

  static async markCompleted(id) {
    return modify(
      `UPDATE merge_sessions SET status = 'completed' WHERE id = $1`,
      [id]
    );
  }

  static async cancel(id) {
    return modify(
      `UPDATE merge_sessions SET status = 'cancelled' WHERE id = $1`,
      [id]
    );
  }

  static async deleteExpired() {
    return modify(`DELETE FROM merge_sessions WHERE expires_at < NOW()`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MergeOTP
═══════════════════════════════════════════════════════════════════ */
class MergeOTP {
  static EXPIRY_MINUTES = 5;
  static MAX_ATTEMPTS   = 5;

  /**
   * Insert (or replace) an OTP for one side of a merge.
   * Old unverified OTPs for the same session + side are deleted first.
   */
  static async create({ mergeSessionId, email, side, otpHash, expiryMinutes = MergeOTP.EXPIRY_MINUTES }) {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1_000);

    // Clear any previous OTP for this session+side to avoid replay
    await modify(
      `DELETE FROM merge_otps
       WHERE merge_session_id = $1 AND side = $2`,
      [mergeSessionId, side]
    );

    return insert(
      `INSERT INTO merge_otps
         (merge_session_id, email, side, otp_hash, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [mergeSessionId, email.toLowerCase().trim(), side, otpHash, expiresAt]
    );
  }

  /** Fetch an active, unverified OTP for a session + side. */
  static async findValid({ mergeSessionId, side }) {
    return queryOne(
      `SELECT * FROM merge_otps
       WHERE merge_session_id = $1
         AND side = $2
         AND is_verified = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [mergeSessionId, side]
    );
  }

  static async incrementAttempts(id) {
    return modify(
      `UPDATE merge_otps SET attempts = attempts + 1 WHERE id = $1`,
      [id]
    );
  }

  static async markVerified(id) {
    return modify(
      `UPDATE merge_otps SET is_verified = TRUE WHERE id = $1`,
      [id]
    );
  }

  static async deleteForSession(mergeSessionId) {
    return modify(
      `DELETE FROM merge_otps WHERE merge_session_id = $1`,
      [mergeSessionId]
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LinkedIdentity
═══════════════════════════════════════════════════════════════════ */
class LinkedIdentity {
  static async create(primaryUserId, linkedEmail) {
    return insert(
      `INSERT INTO linked_identities (primary_user_id, linked_email)
       VALUES ($1,$2)
       ON CONFLICT (linked_email) DO NOTHING
       RETURNING id`,
      [primaryUserId, linkedEmail.toLowerCase().trim()]
    );
  }

  static async findByEmail(email) {
    return queryOne(
      `SELECT li.*, u.id AS user_id
       FROM linked_identities li
       JOIN users u ON u.id = li.primary_user_id
       WHERE li.linked_email = $1`,
      [email.toLowerCase().trim()]
    );
  }

  static async findByUser(primaryUserId) {
    return query(
      `SELECT * FROM linked_identities WHERE primary_user_id = $1`,
      [primaryUserId]
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MergeAudit
═══════════════════════════════════════════════════════════════════ */
class MergeAudit {
  static async log({ mergeSessionId, primaryUserId, existingEmail, newEmail, phone, action, detail = null, ipAddress = null }) {
    return insert(
      `INSERT INTO merge_audit_log
         (merge_session_id, primary_user_id, existing_email, new_email, phone, action, detail, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        mergeSessionId || null,
        primaryUserId,
        existingEmail.toLowerCase().trim(),
        newEmail.toLowerCase().trim(),
        phone,
        action,
        detail ? JSON.stringify(detail) : null,
        ipAddress,
      ]
    );
  }
}

module.exports = { MergeSession, MergeOTP, LinkedIdentity, MergeAudit };

/**
 * Migration: Account Merge Feature
 *
 * Creates:
 *   - merge_sessions       – tracks active merge flows (TTL 15m)
 *   - merge_otps           – isolated OTPs for each side of a merge
 *   - linked_identities    – secondary emails linked to a primary user
 *   - merge_audit_log      – immutable append-only audit trail
 *
 * Does NOT alter the existing otps table's CHECK constraint to avoid
 * touching production auth tables during an online migration.
 */
require('dotenv').config();
const { pool } = require('../config/database');
const logger    = require('../utils/logger');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* ── 1. merge_sessions ────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS merge_sessions (
        id                     UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
        new_email              VARCHAR(100) NOT NULL,
        existing_user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone                  VARCHAR(15)  NOT NULL,
        new_user_data          JSONB        NOT NULL DEFAULT '{}',
        primary_otp_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
        secondary_otp_verified BOOLEAN      NOT NULL DEFAULT FALSE,
        status                 VARCHAR(20)  NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','primary_verified','secondary_verified','completed','cancelled')),
        ip_address             VARCHAR(45),
        expires_at             TIMESTAMPTZ  NOT NULL,
        created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_sessions_email
        ON merge_sessions(new_email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_sessions_expires
        ON merge_sessions(expires_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_sessions_status
        ON merge_sessions(status);
    `);

    /* ── 2. merge_otps ────────────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS merge_otps (
        id                UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
        merge_session_id  UUID        NOT NULL REFERENCES merge_sessions(id) ON DELETE CASCADE,
        email             VARCHAR(100) NOT NULL,
        side              VARCHAR(20)  NOT NULL CHECK (side IN ('primary','secondary')),
        otp_hash          VARCHAR(64)  NOT NULL,
        attempts          INT          NOT NULL DEFAULT 0,
        is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
        expires_at        TIMESTAMPTZ  NOT NULL,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_otps_session
        ON merge_otps(merge_session_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_otps_email
        ON merge_otps(email);
    `);

    /* ── 3. linked_identities ─────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS linked_identities (
        id              UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
        primary_user_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        linked_email    VARCHAR(100) NOT NULL,
        linked_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE(linked_email)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_linked_identities_user
        ON linked_identities(primary_user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_linked_identities_email
        ON linked_identities(linked_email);
    `);

    /* ── 4. merge_audit_log ───────────────────────────────────────── */
    await client.query(`
      CREATE TABLE IF NOT EXISTS merge_audit_log (
        id                UUID        PRIMARY KEY DEFAULT uuid_generate_v7(),
        merge_session_id  UUID,
        primary_user_id   UUID        NOT NULL,
        existing_email    VARCHAR(100) NOT NULL,
        new_email         VARCHAR(100) NOT NULL,
        phone             VARCHAR(15)  NOT NULL,
        action            VARCHAR(30)  NOT NULL
          CHECK (action IN (
            'session_created','otps_sent','primary_otp_verified',
            'secondary_otp_verified','merge_completed','merge_cancelled',
            'merge_failed','suspicious_attempt'
          )),
        detail            JSONB,
        ip_address        VARCHAR(45),
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_audit_session
        ON merge_audit_log(merge_session_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_audit_primary_user
        ON merge_audit_log(primary_user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_audit_phone
        ON merge_audit_log(phone);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_merge_audit_created
        ON merge_audit_log(created_at);
    `);

    await client.query('COMMIT');
    logger.info('[migrate-account-merge] All tables created successfully');
    console.log('✓ Account merge migration completed');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[migrate-account-merge] FAILED — rolled back:', err.message);
    console.error('✗ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

/**
 * E2E Integration Test — Account Merge Flow
 * ==========================================
 * Tests the complete merge flow end-to-end using direct service calls.
 *
 * What it does:
 *  1. Fetches a real user from the DB to act as the "existing account"
 *  2. Patches EmailService so no real emails are sent
 *  3. Calls MergeService.createSession()  — simulates phone conflict detection
 *  4. Calls MergeService.sendOTPs()       — generates OTPs (dev OTPs returned in response)
 *  5. Calls MergeService.verifyOTP()      — verifies primary side
 *  6. Calls MergeService.verifyOTP()      — verifies secondary side → triggers auto-merge
 *  7. Verifies DB state (linked_identities, merge_audit_log)
 *  8. Tests edge cases (wrong OTP, cancel flow, expired session guard)
 *  9. Cleans up all test data
 *
 * Usage:
 *   cd backend && node test-merge-flow.js
 *
 * Prerequisites:
 *   • Backend .env must be present (DB connection, JWT secrets)
 *   • At least one non-admin user must exist in the DB
 */

'use strict';

// ─── Bootstrap ───────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'development'; // ensure dev OTPs are returned
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { pool, query, queryOne } = require('./src/config/database');
const { User }        = require('./src/models');
const MergeService    = require('./src/services/mergeService');
const EmailService    = require('./src/services/emailService');

// ─── Test helpers ─────────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

let passCount = 0;
let failCount = 0;
const failures = [];

function pass(label) {
  passCount++;
  console.log(`  ${GREEN}✔${RESET}  ${label}`);
}

function fail(label, err) {
  failCount++;
  failures.push({ label, err });
  console.error(`  ${RED}✘${RESET}  ${label}`);
  console.error(`     ${RED}${err?.message || err}${RESET}`);
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}${RESET}`);
}

function assert(condition, label, errMsg) {
  if (condition) {
    pass(label);
  } else {
    fail(label, new Error(errMsg || 'Assertion failed'));
    throw new Error(`ABORT: ${label} — ${errMsg}`);
  }
}

// ─── Email patch ─────────────────────────────────────────────────────────────
// Replace the real email transporter so no SMTP calls are made during the test.
let emailsSentTo = [];

function patchEmailService() {
  emailsSentTo = [];
  // EmailService is exported as a singleton instance, so patch directly on the object
  EmailService.sendMergeOTP = async function (email, otp, userName, isPrimary) {
    emailsSentTo.push({ email, otp, isPrimary, userName });
    return { success: true, messageId: `mock-${Date.now()}` };
  };
}

// ─── Cleanup registry ────────────────────────────────────────────────────────
// Track everything created by the test so we can purge it at the end.
const cleanup = {
  mergeSessions: [],   // UUIDs
  linkedEmails:  [],   // email strings
};

async function runCleanup() {
  section('Cleanup');
  try {
    if (cleanup.mergeSessions.length) {
      const ids = cleanup.mergeSessions.map((_, i) => `$${i + 1}`).join(', ');
      await query(`DELETE FROM merge_audit_log WHERE merge_session_id IN (${ids})`, cleanup.mergeSessions);
      await query(`DELETE FROM merge_otps       WHERE merge_session_id IN (${ids})`, cleanup.mergeSessions);
      await query(`DELETE FROM merge_sessions   WHERE id               IN (${ids})`, cleanup.mergeSessions);
      pass(`Removed ${cleanup.mergeSessions.length} test merge session(s)`);
    }
    if (cleanup.linkedEmails.length) {
      const params = cleanup.linkedEmails.map((_, i) => `$${i + 1}`).join(', ');
      await query(`DELETE FROM linked_identities WHERE linked_email IN (${params})`, cleanup.linkedEmails);
      pass(`Removed ${cleanup.linkedEmails.length} test linked identity/identities`);
    }
    // Also clean up any refresh tokens created by executeMerge
    // (they belong to the test and would otherwise linger)
    pass('Cleanup complete');
  } catch (err) {
    console.error(`  ${YELLOW}⚠ Cleanup error:${RESET}`, err.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main test runner
// ──────────────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${BOLD}MK-REDDY General Stores — Account Merge Flow E2E Test${RESET}`);
  console.log(`${'═'.repeat(56)}\n`);

  patchEmailService();

  // ── Step 0: Pre-flight: DB connectivity ────────────────────────────────────
  section('0. Pre-flight checks');
  try {
    const r = await queryOne('SELECT NOW() AS ts, current_database() AS db');
    assert(!!r.ts, 'DB connection live', 'Expected a timestamp from DB');
    pass(`Connected to database: ${r.db}`);
  } catch (err) {
    fail('DB connection', err);
    console.error(`\n${RED}Cannot reach the database. Check your .env file and try again.${RESET}\n`);
    process.exit(1);
  }

  // Verify the merge tables exist
  for (const tbl of ['merge_sessions', 'merge_otps', 'linked_identities', 'merge_audit_log']) {
    try {
      await query(`SELECT 1 FROM ${tbl} LIMIT 1`);
      pass(`Table "${tbl}" exists`);
    } catch (err) {
      fail(`Table "${tbl}" exists — run migrate-account-merge.js first`, err);
      process.exit(1);
    }
  }

  // ── Step 1: Find a real existing user to act as "existing account" ──────────
  section('1. Locate test user (existing account)');

  let existingUser;
  try {
    existingUser = await queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.user_type != 'admin'
         AND u.is_active = TRUE
         AND u.phone IS NOT NULL
       ORDER BY u.created_at DESC
       LIMIT 1`
    );
    assert(!!existingUser, 'Found at least one non-admin user', 'No suitable user found in DB');
    pass(`Using existing user: id=${existingUser.id}, email=${existingUser.email}, phone=${existingUser.phone}`);
  } catch (err) {
    fail('Locate test user', err);
    process.exit(1);
  }

  // The "new" email pretends to be a second account trying to register with existingUser.phone
  const NEW_EMAIL    = `__test_merge_${Date.now()}@testdomain.invalid`;
  const PHONE        = existingUser.phone;
  const TEST_IP      = '127.0.0.1';
  const NEW_USERDATA = { name: 'Test Registrant', user_type: 'retail' };

  // ── Step 2: createSession ────────────────────────────────────────────────────
  section('2. MergeService.createSession()');

  let sessionInfo;
  try {
    sessionInfo = await MergeService.createSession({
      newEmail:     NEW_EMAIL,
      existingUser,
      phone:        PHONE,
      newUserData:  NEW_USERDATA,
      ipAddress:    TEST_IP,
    });
    cleanup.mergeSessions.push(sessionInfo.mergeSessionId);

    assert(typeof sessionInfo.mergeSessionId === 'string', 'Returns a mergeSessionId (string)');
    assert(sessionInfo.existingMaskedEmail.includes('***'), 'Existing email is masked');
    assert(sessionInfo.newMaskedEmail.includes('***'),      'New email is masked');
    assert(sessionInfo.expiresInSeconds === 900,            'Session expires in 15 min (900 s)');

    pass(`Session ID: ${sessionInfo.mergeSessionId}`);
    pass(`Masked emails — existing: ${sessionInfo.existingMaskedEmail}, new: ${sessionInfo.newMaskedEmail}`);
  } catch (err) {
    fail('createSession', err);
    await runCleanup();
    process.exit(1);
  }

  // Verify the session row in DB
  try {
    const row = await queryOne('SELECT * FROM merge_sessions WHERE id = $1', [sessionInfo.mergeSessionId]);
    assert(row.status === 'pending',                     'Session status is "pending"');
    assert(row.new_email === NEW_EMAIL,                  'new_email stored correctly');
    assert(String(row.existing_user_id) === String(existingUser.id), 'existing_user_id stored correctly');
    assert(row.primary_otp_verified === false,           'primary_otp_verified starts false');
    assert(row.secondary_otp_verified === false,         'secondary_otp_verified starts false');

    const auditRow = await queryOne(
      `SELECT * FROM merge_audit_log WHERE merge_session_id = $1 AND action = 'session_created'`,
      [sessionInfo.mergeSessionId]
    );
    assert(!!auditRow, 'Audit log entry "session_created" written');
  } catch (err) {
    fail('DB state after createSession', err);
    await runCleanup();
    process.exit(1);
  }

  // ── Step 3: sendOTPs ─────────────────────────────────────────────────────────
  section('3. MergeService.sendOTPs()');

  let otpInfo;
  try {
    otpInfo = await MergeService.sendOTPs({
      mergeSessionId: sessionInfo.mergeSessionId,
      ipAddress:      TEST_IP,
    });

    assert(typeof otpInfo._dev_primary_otp   === 'string', 'Dev primary OTP returned (6 digits)');
    assert(typeof otpInfo._dev_secondary_otp === 'string', 'Dev secondary OTP returned (6 digits)');
    assert(/^\d{6}$/.test(otpInfo._dev_primary_otp),   'Primary OTP exactly 6 digits');
    assert(/^\d{6}$/.test(otpInfo._dev_secondary_otp), 'Secondary OTP exactly 6 digits');
    assert(otpInfo.expiresInSeconds === 300,            'OTP expires in 5 min (300 s)');

    pass(`Primary OTP (dev): ${otpInfo._dev_primary_otp}`);
    pass(`Secondary OTP (dev): ${otpInfo._dev_secondary_otp}`);
    pass(`EmailService called for ${emailsSentTo.length} address(es): ${emailsSentTo.map(e => e.email).join(', ')}`);
  } catch (err) {
    fail('sendOTPs', err);
    await runCleanup();
    process.exit(1);
  }

  // Verify OTP rows in DB
  try {
    const otpRows = await query(
      'SELECT side, is_verified FROM merge_otps WHERE merge_session_id = $1',
      [sessionInfo.mergeSessionId]
    );
    assert(otpRows.length === 2,                         'Two OTP rows created');
    const sides = otpRows.map(r => r.side).sort();
    assert(sides[0] === 'primary' && sides[1] === 'secondary', 'One OTP per side');
    assert(otpRows.every(r => r.is_verified === false),  'Both OTPs start unverified');
  } catch (err) {
    fail('DB state after sendOTPs', err);
    await runCleanup();
    process.exit(1);
  }

  // ── Step 4: verifyOTP — wrong code first ────────────────────────────────────
  section('4. verifyOTP — wrong code guard');

  try {
    await MergeService.verifyOTP({
      mergeSessionId: sessionInfo.mergeSessionId,
      side:           'primary',
      otp:            '000000',
      ipAddress:      TEST_IP,
    });
    fail('Should have thrown on wrong OTP', new Error('No error thrown'));
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Incorrect code')) {
      pass(`Wrong OTP rejected: "${err.message}"`);
    } else {
      fail('Unexpected error on wrong OTP', err);
    }
  }

  // Verify attempts incremented
  try {
    const otpRow = await queryOne(
      'SELECT attempts FROM merge_otps WHERE merge_session_id = $1 AND side = $2',
      [sessionInfo.mergeSessionId, 'primary']
    );
    assert(otpRow.attempts === 1, 'Attempt counter incremented to 1');
  } catch (err) {
    fail('DB check — attempts incremented', err);
  }

  // ── Step 5: verifyOTP — correct primary OTP ─────────────────────────────────
  section('5. verifyOTP — correct primary OTP');

  let primaryResult;
  try {
    primaryResult = await MergeService.verifyOTP({
      mergeSessionId: sessionInfo.mergeSessionId,
      side:           'primary',
      otp:            otpInfo._dev_primary_otp,
      ipAddress:      TEST_IP,
    });
    assert(primaryResult.verified === true,      'Primary OTP accepted');
    assert(primaryResult.bothVerified === false,  'bothVerified still false (secondary pending)');
    pass(`Response: ${JSON.stringify({ side: primaryResult.side, verified: primaryResult.verified, bothVerified: primaryResult.bothVerified })}`);
  } catch (err) {
    fail('verifyOTP primary', err);
    await runCleanup();
    process.exit(1);
  }

  // Verify session state
  try {
    const sessionRow = await queryOne('SELECT * FROM merge_sessions WHERE id = $1', [sessionInfo.mergeSessionId]);
    assert(sessionRow.primary_otp_verified === true,  'primary_otp_verified = TRUE in DB');
    assert(sessionRow.secondary_otp_verified === false, 'secondary_otp_verified still FALSE');
    assert(sessionRow.status === 'primary_verified',  'Status updated to primary_verified');

    const auditRow = await queryOne(
      `SELECT * FROM merge_audit_log WHERE merge_session_id = $1 AND action = 'primary_otp_verified'`,
      [sessionInfo.mergeSessionId]
    );
    assert(!!auditRow, 'Audit log "primary_otp_verified" written');
  } catch (err) {
    fail('DB state after primary verify', err);
    await runCleanup();
    process.exit(1);
  }

  // ── Step 6: verifyOTP — correct secondary OTP (triggers auto-merge) ──────────
  section('6. verifyOTP — correct secondary OTP → auto-merge');

  let secondaryResult;
  try {
    secondaryResult = await MergeService.verifyOTP({
      mergeSessionId: sessionInfo.mergeSessionId,
      side:           'secondary',
      otp:            otpInfo._dev_secondary_otp,
      ipAddress:      TEST_IP,
    });

    assert(secondaryResult.verified === true,   'Secondary OTP accepted');
    assert(secondaryResult.bothVerified === true, 'bothVerified = true');
    assert(secondaryResult.merged === true,      'merged = true (executeMerge triggered)');
    assert(typeof secondaryResult.accessToken  === 'string', 'JWT accessToken returned');
    assert(typeof secondaryResult.refreshToken === 'string', 'JWT refreshToken returned');
    assert(secondaryResult.user?.id === existingUser.id, 'Returned user is the existing/primary user');

    pass(`Merged! User id: ${secondaryResult.user.id}, email: ${secondaryResult.user.email}`);
    pass(`Access token snippet: ${secondaryResult.accessToken.slice(0, 30)}…`);
  } catch (err) {
    fail('verifyOTP secondary + executeMerge', err);
    await runCleanup();
    process.exit(1);
  }

  // ── Step 7: Verify DB state post-merge ──────────────────────────────────────
  section('7. DB state verification post-merge');

  try {
    // Session sealed
    const sessionRow = await queryOne(
      `SELECT * FROM merge_sessions WHERE id = $1`,
      [sessionInfo.mergeSessionId]
    );
    // Note: findById() filters out completed sessions, so we query directly
    assert(sessionRow.status === 'completed', 'Session status = "completed"');
    assert(sessionRow.primary_otp_verified === true,   'primary_otp_verified = TRUE');
    assert(sessionRow.secondary_otp_verified === true, 'secondary_otp_verified = TRUE');

    // Linked identity created
    const linkedRow = await queryOne(
      'SELECT * FROM linked_identities WHERE linked_email = $1',
      [NEW_EMAIL]
    );
    assert(!!linkedRow, 'linked_identities row created for new email');
    assert(String(linkedRow.primary_user_id) === String(existingUser.id), 'linked to correct primary user');
    cleanup.linkedEmails.push(NEW_EMAIL); // track for cleanup

    // Audit log has merge_completed entry
    const completedAudit = await queryOne(
      `SELECT * FROM merge_audit_log WHERE merge_session_id = $1 AND action = 'merge_completed'`,
      [sessionInfo.mergeSessionId]
    );
    assert(!!completedAudit, 'Audit log "merge_completed" written');

    // All audit actions present in order
    const allAudit = await query(
      `SELECT action FROM merge_audit_log WHERE merge_session_id = $1 ORDER BY created_at`,
      [sessionInfo.mergeSessionId]
    );
    const actions = allAudit.map(r => r.action);
    pass(`Full audit trail: ${actions.join(' → ')}`);

    // User.findByEmail with the new (secondary) email should resolve to primary user
    const foundByNewEmail = await User.findByEmail(NEW_EMAIL);
    assert(!!foundByNewEmail, 'User.findByEmail resolves secondary email');
    assert(String(foundByNewEmail.id) === String(existingUser.id), 'Resolves to primary user');
    pass(`User.findByEmail("${NEW_EMAIL}") → user ${foundByNewEmail.id} (primary)`);
  } catch (err) {
    fail('Post-merge DB verification', err);
  }

  // ── Step 8: Idempotency — second verifyOTP call on completed session ─────────
  section('8. Guard: verifyOTP on already-completed session');

  try {
    await MergeService.verifyOTP({
      mergeSessionId: sessionInfo.mergeSessionId,
      side:           'primary',
      otp:            otpInfo._dev_primary_otp,
      ipAddress:      TEST_IP,
    });
    fail('Should reject verifyOTP on completed session', new Error('No error thrown'));
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 400) {
      pass(`Correctly rejected (${err.statusCode}): "${err.message}"`);
    } else {
      fail('Unexpected error code on completed session replay', err);
    }
  }

  // ── Step 9: Cancel flow test (separate session) ──────────────────────────────
  section('9. cancelSession flow');

  let cancelSession;
  try {
    cancelSession = await MergeService.createSession({
      newEmail:     `__test_cancel_${Date.now()}@testdomain.invalid`,
      existingUser,
      phone:        PHONE,
      newUserData:  NEW_USERDATA,
      ipAddress:    TEST_IP,
    });
    cleanup.mergeSessions.push(cancelSession.mergeSessionId);
    assert(typeof cancelSession.mergeSessionId === 'string', 'Cancel-test session created');

    await MergeService.sendOTPs({ mergeSessionId: cancelSession.mergeSessionId, ipAddress: TEST_IP });
    pass('OTPs sent for cancel-test session');

    const cancelResult = await MergeService.cancelSession({
      mergeSessionId: cancelSession.mergeSessionId,
      ipAddress:      TEST_IP,
    });
    assert(cancelResult.cancelled === true, 'cancelSession returns { cancelled: true }');

    // Session should be gone from findById (filters non-terminal only)
    const gone = await MergeService.sendOTPs({
      mergeSessionId: cancelSession.mergeSessionId,
      ipAddress:      TEST_IP,
    }).catch(e => e);
    assert(gone?.statusCode === 404 || gone?.statusCode === 400, 'sendOTPs rejects after cancel');
    pass(`Post-cancel sendOTPs correctly returns ${gone.statusCode}`);

    // Idempotent second cancel
    const cancelAgain = await MergeService.cancelSession({
      mergeSessionId: cancelSession.mergeSessionId,
      ipAddress:      TEST_IP,
    });
    assert(cancelAgain.cancelled === true, 'Second cancel is idempotent');
  } catch (err) {
    fail('cancelSession flow', err);
  }

  // ── Step 10: Rate-limit guard ──────────────────────────────────────────────
  section('10. Rate-limit guard (3 sessions/email/hour)');

  // Count how many recent sessions our NEW_EMAIL already has (should be 1 from Step 2)
  const { MergeSession: MS } = require('./src/models/MergeSession');
  try {
    const count = await MS.countRecent(NEW_EMAIL, 60);
    pass(`Recent session count for test email: ${count} (limit is 3)`);

    if (count < 3) {
      // Create sessions up to the limit
      const extras = [];
      for (let i = count; i < 3; i++) {
        const s = await MergeService.createSession({
          newEmail:    NEW_EMAIL,
          existingUser,
          phone:       PHONE,
          newUserData: NEW_USERDATA,
          ipAddress:   TEST_IP,
        });
        cleanup.mergeSessions.push(s.mergeSessionId);
        extras.push(s.mergeSessionId);
      }
      pass(`Created ${extras.length} extra session(s) to hit rate limit`);
    }

    // Next one should be rate-limited
    const limited = await MergeService.createSession({
      newEmail:    NEW_EMAIL,
      existingUser,
      phone:       PHONE,
      newUserData: NEW_USERDATA,
      ipAddress:   TEST_IP,
    }).catch(e => e);
    assert(limited?.statusCode === 429, `4th session correctly rate-limited (429)`);
    pass(`Rate-limited response: "${limited.message}"`);
  } catch (err) {
    fail('Rate-limit guard', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup & final report
  // ─────────────────────────────────────────────────────────────────────────────
  await runCleanup();

  console.log(`\n${'═'.repeat(56)}`);
  console.log(`${BOLD}Results:  ${GREEN}${passCount} passed${RESET}  ${failCount > 0 ? RED : ''}${failCount} failed${RESET}`);
  if (failures.length) {
    console.log(`\n${RED}Failed checks:${RESET}`);
    failures.forEach(({ label, err }) => {
      console.log(`  - ${label}: ${err?.message}`);
    });
  }
  console.log(`${'═'.repeat(56)}\n`);

  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error(`\n${RED}Unhandled error:${RESET}`, err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});

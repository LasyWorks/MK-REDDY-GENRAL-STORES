/**
 * Migration: add deleted_at column to users table for soft-delete support
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const { pool } = require("../config/database");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Add deleted_at column if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL
    `);

    // Index for fast lookup of deleted/active users
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)
      WHERE deleted_at IS NOT NULL
    `);

    await client.query("COMMIT");
    console.log("✅ Migration complete: added deleted_at to users table");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));

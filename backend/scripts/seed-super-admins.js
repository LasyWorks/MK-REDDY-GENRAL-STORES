/**
 * seed-super-admins.js
 *
 * Run with:  node backend/scripts/seed-super-admins.js
 *
 * What it does:
 *  1. Adds the is_super_admin column to the users table (idempotent).
 *  2. For each super-admin email, either:
 *     - Updates the existing account to admin + is_super_admin = TRUE, or
 *     - Creates a new admin account and prints the generated temp password.
 */

"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const SUPER_ADMINS = [
  { email: "anuradhap1784@gmail.com", name: "Anuradha", phone: "0000000001" },
  { email: "mkreddygeneralstore@gmail.com", name: "MK Reddy Store", phone: "0000000002" },
];

async function run() {
  const client = await pool.connect();
  try {
    // Step 1 — add column if not already present
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("Column is_super_admin ensured.");

    // Step 2 — get admin role id
    const roleRow = await client.query(
      `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`
    );
    if (!roleRow.rows.length) {
      throw new Error("Admin role not found in roles table. Run migrations first.");
    }
    const adminRoleId = roleRow.rows[0].id;

    for (const sa of SUPER_ADMINS) {
      const existing = await client.query(
        `SELECT id, email, user_type, is_super_admin FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [sa.email]
      );

      if (existing.rows.length) {
        // Account exists — promote to super admin
        await client.query(
          `UPDATE users
             SET user_type = 'admin',
                 role_id = $1,
                 is_super_admin = TRUE,
                 is_active = TRUE,
                 is_blocked = FALSE
           WHERE id = $2`,
          [adminRoleId, existing.rows[0].id]
        );
        console.log(`Updated existing user '${sa.email}' -> super admin.`);
      } else {
        // Check if placeholder phone is taken
        const phoneCheck = await client.query(
          `SELECT id FROM users WHERE phone = $1`,
          [sa.phone]
        );
        const finalPhone = phoneCheck.rows.length
          ? `${sa.phone}_${Date.now()}`
          : sa.phone;

        // Generate a random temp password
        const tempPassword = crypto.randomBytes(10).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        await client.query(
          `INSERT INTO users
             (name, phone, email, user_type, role_id, password_hash, is_active, is_super_admin, email_verified)
           VALUES ($1, $2, $3, 'admin', $4, $5, TRUE, TRUE, TRUE)`,
          [sa.name, finalPhone, sa.email, adminRoleId, passwordHash]
        );

        console.log(`\nCreated new super admin account:`);
        console.log(`  Email   : ${sa.email}`);
        console.log(`  Phone   : ${finalPhone}  (placeholder — update this if needed)`);
        console.log(`  Password: ${tempPassword}  <-- SAVE THIS, it will not be shown again\n`);
      }
    }

    console.log("\nDone. Super admins are set up.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

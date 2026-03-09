/**
 * Migration: Add product_variant to order_items
 *
 * Adds a product_variant column to order_items so the size/pack label
 * (e.g. "250g", "1 kg", "500 ml") is captured at order time rather than
 * relying on a JOIN back to the products table (which may change later).
 *
 * Safe to run multiple times — uses IF NOT EXISTS / column-existence check.
 */
require('dotenv').config();
const { pool } = require('../config/database');
const logger   = require('../utils/logger');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* ── 1. Add product_variant column if it doesn't exist ─────────── */
    await client.query(`
      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS product_variant VARCHAR(100) DEFAULT NULL;
    `);

    /* ── 2. Back-fill existing rows from products table ─────────────── */
    await client.query(`
      UPDATE order_items oi
      SET product_variant = COALESCE(p.variant, p.unit_pack_size)
      FROM products p
      WHERE oi.product_id = p.id
        AND oi.product_variant IS NULL
        AND COALESCE(p.variant, p.unit_pack_size) IS NOT NULL;
    `);

    await client.query('COMMIT');
    logger.info('Migration migrate-order-item-variant: completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Migration migrate-order-item-variant: FAILED', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();

/**
 * Migration: Per-product low stock threshold
 *
 * Adds low_stock_threshold column to products so each product can have
 * its own reorder point instead of a global hardcoded limit.
 *
 * Default is 10 (same as the old hardcoded value).
 *
 * Usage:
 *   node src/database/migrate-low-stock-threshold.js
 */

const { query } = require('../config/database');

async function migrate() {
  const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();

  if (DB_TYPE === 'mysql') {
    console.log('Running low-stock-threshold migration on MySQL...');
    await query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 10
    `);
    console.log('MySQL: low_stock_threshold column added.');
  } else {
    console.log('Running low-stock-threshold migration on PostgreSQL...');
    await query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10
    `);
    console.log('PostgreSQL: low_stock_threshold column added.');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

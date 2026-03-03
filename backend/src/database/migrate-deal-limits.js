/**
 * Migration: add deal_limit and deals_claimed to promotion_products
 *
 * deal_limit   INT NULL    — max number of deals available; NULL = unlimited (no progress bar)
 * deals_claimed INT NOT NULL DEFAULT 0 — how many orders have used this deal
 *
 * Run: node backend/src/database/migrate-deal-limits.js
 */
const { Client } = require('pg');
require('dotenv').config();

const run = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mk_kirana_stores',
  });
  await client.connect();
  console.log('Connected – running deal-limits migration…');

  // Add deal_limit column (NULL = unlimited)
  await client.query(`
    ALTER TABLE promotion_products
      ADD COLUMN IF NOT EXISTS deal_limit    INT     NULL,
      ADD COLUMN IF NOT EXISTS deals_claimed INT     NOT NULL DEFAULT 0;
  `);
  console.log('✓ Added deal_limit, deals_claimed to promotion_products');

  // Index for fast remaining-deals queries
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_promo_products_deal_limit
      ON promotion_products(promotion_id, deal_limit, deals_claimed);
  `);
  console.log('✓ Index created');

  // Constraint: deals_claimed can never exceed deal_limit (when deal_limit is set)
  // Uses a CHECK so the DB enforces it even on direct SQL updates
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_deals_claimed_lte_limit'
          AND conrelid = 'promotion_products'::regclass
      ) THEN
        ALTER TABLE promotion_products
          ADD CONSTRAINT chk_deals_claimed_lte_limit
          CHECK (deal_limit IS NULL OR deals_claimed <= deal_limit);
      END IF;
    END $$;
  `);
  console.log('✓ CHECK constraint added');

  await client.end();
  console.log('✅ Deal-limits migration complete.');
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

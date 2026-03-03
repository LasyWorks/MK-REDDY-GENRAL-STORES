/**
 * Migration: add item_limit and items_claimed to promotion_products
 *
 * item_limit    INT NULL     — max total units that can be sold at promo price; NULL = unlimited
 * items_claimed INT NOT NULL — total units claimed so far across all orders
 *
 * Run: node backend/src/database/migrate-item-limits.js
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
  console.log('Connected – running item-limits migration…');

  await client.query(`
    ALTER TABLE promotion_products
      ADD COLUMN IF NOT EXISTS item_limit    INT  NULL,
      ADD COLUMN IF NOT EXISTS items_claimed INT  NOT NULL DEFAULT 0;
  `);
  console.log('✓ Added item_limit, items_claimed to promotion_products');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_promo_products_item_limit
      ON promotion_products(promotion_id, item_limit, items_claimed);
  `);
  console.log('✓ Index created');

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_items_claimed_lte_item_limit'
          AND conrelid = 'promotion_products'::regclass
      ) THEN
        ALTER TABLE promotion_products
          ADD CONSTRAINT chk_items_claimed_lte_item_limit
          CHECK (item_limit IS NULL OR items_claimed <= item_limit);
      END IF;
    END $$;
  `);
  console.log('✓ CHECK constraint added');

  await client.end();
  console.log('✅ Item-limits migration complete.');
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

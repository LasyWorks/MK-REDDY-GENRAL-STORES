/**
 * Migration: Add parent_product_id to products
 *
 * This enables product variant grouping — e.g. Toor Dal sold in
 * 250 gm, 500 gm, 750 gm, 1 kg can be four separate product rows
 * that all point to one "parent" product.
 *
 * Usage:
 *   node src/database/migrate-product-variants.js
 */
const { query } = require('../config/database');

async function migrate() {
  console.log('Adding parent_product_id column to products table...');

  await query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS parent_product_id UUID
      REFERENCES products(id) ON DELETE SET NULL;
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_products_parent
      ON products(parent_product_id);
  `);

  console.log('Migration complete. Products can now share a parent.');
  console.log('');
  console.log('HOW TO USE:');
  console.log('  1. Create the base product (e.g. "Toor Dal 250gm") — leave parent_product_id empty.');
  console.log('  2. Create additional weight variants (500gm, 750gm, 1kg).');
  console.log('     Set each variant\'s parent_product_id = <id of 250gm product>.');
  console.log('  3. Fill in unit_pack_size ("250gm", "500gm", "750gm", "1kg") for each.');
  console.log('  4. The product detail page automatically shows weight-selector buttons.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });

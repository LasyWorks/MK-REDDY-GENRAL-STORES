/**
 * Migration: Loose item bulk stock tracking
 *
 * Changes stock_quantity, cart_items.quantity, and order_items.quantity
 * from INT to NUMERIC(10,3) so that loose/bulk items can track stock
 * directly in kg with decimal precision.
 *
 * Before this migration:
 *   - Loose items stored stock as packet counts (50 kg / 1 kg = 50 packets)
 *
 * After this migration:
 *   - Loose items store stock in kg directly (50 kg stored as 50.000)
 *   - A 1 kg order deducts 1.000 from stock, leaving 49.000 kg
 *   - A 500 g order deducts 0.500 from stock, leaving 49.500 kg
 *   - Regular (non-loose) items continue to use whole numbers (1, 2, 3 ...)
 *
 * Usage:
 *   node src/database/migrate-loose-stock.js
 */

const { query } = require('../config/database');

async function migrate() {
  const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();

  if (DB_TYPE === 'mysql') {
    console.log('Running loose-stock migration on MySQL...');

    await query(`
      ALTER TABLE products
        MODIFY COLUMN stock_quantity DECIMAL(10,3) NOT NULL DEFAULT 0
    `);
    console.log('  products.stock_quantity -> DECIMAL(10,3)');

    await query(`
      ALTER TABLE cart_items
        MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL DEFAULT 1
    `);
    console.log('  cart_items.quantity -> DECIMAL(10,3)');

    await query(`
      ALTER TABLE order_items
        MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL
    `);
    console.log('  order_items.quantity -> DECIMAL(10,3)');

  } else {
    console.log('Running loose-stock migration on PostgreSQL...');

    await query(`
      ALTER TABLE products
        ALTER COLUMN stock_quantity
        TYPE NUMERIC(10,3) USING stock_quantity::NUMERIC(10,3)
    `);
    console.log('  products.stock_quantity -> NUMERIC(10,3)');

    await query(`
      ALTER TABLE cart_items
        ALTER COLUMN quantity
        TYPE NUMERIC(10,3) USING quantity::NUMERIC(10,3)
    `);
    console.log('  cart_items.quantity -> NUMERIC(10,3)');

    await query(`
      ALTER TABLE order_items
        ALTER COLUMN quantity
        TYPE NUMERIC(10,3) USING quantity::NUMERIC(10,3)
    `);
    console.log('  order_items.quantity -> NUMERIC(10,3)');
  }

  console.log('');
  console.log('Migration complete.');
  console.log('');
  console.log('HOW LOOSE STOCK NOW WORKS:');
  console.log('  1. Admin sets unit_type = "loose" on a product.');
  console.log('  2. Admin enters stock directly in kg (e.g. 50 for 50 kg).');
  console.log('     stock_quantity = 50.000 (no packet conversion).');
  console.log('  3. Customer picks a weight from the product page:');
  console.log('     250 g = 0.250, 500 g = 0.500, 1 kg = 1.000, 2 kg = 2.000 ...');
  console.log('  4. Each order deducts the ordered kg from stock_quantity.');
  console.log('     50 kg - 1 kg order = 49 kg remaining.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });

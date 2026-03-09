/**
 * migrate-fix-prices.js
 *
 * Fixes the product price hierarchy in the database.
 *
 * PROBLEM:
 *   - wholesale_price was stored as purchase_price * (1 + GST%) which is the
 *     GST-inclusive cost, NOT a B2B selling price.  This made wholesale_price
 *     HIGHER than both retail price and MRP for almost every product.
 *   - Many products have price > mrp (illegal in India).
 *   - Some products have purchase_price > mrp (data-entry errors).
 *
 * CORRECT HIERARCHY:
 *   purchase_price  <=  wholesale_price  <=  price (retail)  <=  MRP
 *
 * FIX STRATEGY:
 *   1. MRP must be >= price.  Where MRP < price, set MRP = price.
 *   2. Retail price must be <= MRP.  Where price > MRP, set price = MRP.
 *   3. purchase_price left as-is (original supplier invoice data).
 *   4. wholesale_price recalculated as price * 0.90 (10% below retail).
 *      - If a valid purchase_price exists, ensure ws >= purchase_price
 *        (store must not sell below cost even to wholesale).
 *   5. Set store_settings wholesale_discount_pct = 10 as fallback for
 *      products that don't have an explicit wholesale_price.
 *
 * This migration is IDEMPOTENT - safe to run multiple times.
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { query, modify } = require("../config/database");
const logger = require("../utils/logger");

async function migrate() {
  console.log("=== Fix Product Prices Migration ===\n");

  // ── Step 0: Snapshot current state ──────────────────────────────────────
  const before = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN wholesale_price > price THEN 1 END)::int AS ws_above_retail,
      COUNT(CASE WHEN price > mrp AND mrp IS NOT NULL AND mrp > 0 THEN 1 END)::int AS retail_above_mrp,
      COUNT(CASE WHEN wholesale_price > mrp AND mrp IS NOT NULL AND mrp > 0 THEN 1 END)::int AS ws_above_mrp
    FROM products
  `);
  console.log("BEFORE:", JSON.stringify(before[0]));

  // ── Step 1: Fix MRP — must be >= retail price ───────────────────────────
  const mrpFixed = await modify(`
    UPDATE products
    SET mrp = price, updated_at = NOW()
    WHERE mrp IS NOT NULL AND mrp > 0 AND mrp < price
  `);
  console.log(`Step 1: Fixed ${mrpFixed} products where MRP < retail price (set MRP = price)`);

  // ── Step 2: Fix retail price — must be <= MRP ──────────────────────────
  const priceFixed = await modify(`
    UPDATE products
    SET price = mrp, updated_at = NOW()
    WHERE mrp IS NOT NULL AND mrp > 0 AND price > mrp
  `);
  console.log(`Step 2: Fixed ${priceFixed} products where retail price > MRP (set price = MRP)`);

  // ── Step 3: Recalculate wholesale_price ─────────────────────────────────
  //    Base: 10% below retail price.
  //    Floor: purchase_price (never sell below cost).
  //    Ceiling: price (wholesale can never exceed retail).

  // 3a: Products WITH a valid purchase_price — ws = MAX(purchase_price, price * 0.90)
  const wsFixedA = await modify(`
    UPDATE products
    SET wholesale_price = ROUND(GREATEST(purchase_price, price * 0.90)::numeric, 2),
        updated_at = NOW()
    WHERE purchase_price IS NOT NULL
      AND purchase_price > 0
      AND purchase_price <= price
  `);
  console.log(`Step 3a: Recalculated wholesale_price for ${wsFixedA} products (with valid purchase_price)`);

  // 3b: Products where purchase_price is missing, zero, or exceeds price — ws = price * 0.90
  const wsFixedB = await modify(`
    UPDATE products
    SET wholesale_price = ROUND((price * 0.90)::numeric, 2),
        updated_at = NOW()
    WHERE purchase_price IS NULL
       OR purchase_price <= 0
       OR purchase_price > price
  `);
  console.log(`Step 3b: Recalculated wholesale_price for ${wsFixedB} products (no valid purchase_price, using 10% off retail)`);

  // ── Step 4: Safety net — ensure wholesale_price <= price ────────────────
  const wsCapped = await modify(`
    UPDATE products
    SET wholesale_price = price, updated_at = NOW()
    WHERE wholesale_price > price
  `);
  console.log(`Step 4: Capped ${wsCapped} products where wholesale_price still exceeded retail`);

  // ── Step 5: Set store-wide wholesale_discount_pct ───────────────────────
  await modify(`
    INSERT INTO store_settings (key, value, label, description, updated_at)
    VALUES (
      'wholesale_discount_pct', '10',
      'Wholesale Discount %',
      'Default percentage discount off retail price for wholesale customers (used when product has no explicit wholesale_price)',
      NOW()
    )
    ON CONFLICT (key) DO UPDATE SET value = '10', updated_at = NOW()
  `);
  console.log("Step 5: Set wholesale_discount_pct = 10 in store_settings");

  // ── Step 6: Verify final state ──────────────────────────────────────────
  const after = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN wholesale_price > price THEN 1 END)::int AS ws_above_retail,
      COUNT(CASE WHEN price > mrp AND mrp IS NOT NULL AND mrp > 0 THEN 1 END)::int AS retail_above_mrp,
      COUNT(CASE WHEN wholesale_price > mrp AND mrp IS NOT NULL AND mrp > 0 THEN 1 END)::int AS ws_above_mrp
    FROM products
  `);
  console.log("\nAFTER:", JSON.stringify(after[0]));

  // Print a few samples
  const samples = await query(`
    SELECT id, mrp, purchase_price, price, wholesale_price
    FROM products
    WHERE purchase_price IS NOT NULL AND purchase_price > 0
    ORDER BY RANDOM()
    LIMIT 8
  `);
  console.log("\nSample products after fix:");
  for (const p of samples) {
    const ok =
      parseFloat(p.wholesale_price) <= parseFloat(p.price) &&
      parseFloat(p.price) <= parseFloat(p.mrp);
    console.log(
      `  purchase=${p.purchase_price} ws=${p.wholesale_price} retail=${p.price} mrp=${p.mrp}`,
      ok ? "OK" : "VIOLATION"
    );
  }

  console.log("\n=== Migration complete ===");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

/**
 * Migration: create store_settings table for admin-configurable charges
 * Stores key-value settings like delivery_charge, handling_charge, min_order_amount
 */
const { pool } = require("../config/database");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create store_settings table — simple key/value store
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        label VARCHAR(200),
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default settings if not existing
    const defaults = [
      {
        key: "min_order_amount",
        value: "100",
        label: "Minimum Order Amount (₹)",
        description:
          "Minimum cart value required to place an order. Orders below this amount will be blocked.",
      },
      {
        key: "delivery_charge",
        value: "0",
        label: "Delivery Charge (₹)",
        description:
          "Flat delivery fee added to every order. Set to 0 for free delivery.",
      },
      {
        key: "handling_charge",
        value: "2",
        label: "Handling Charge (₹)",
        description:
          "Small handling/packaging fee added to every order. Set to 0 to disable.",
      },
    ];

    for (const s of defaults) {
      await client.query(
        `INSERT INTO store_settings (key, value, label, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [s.key, s.value, s.label, s.description]
      );
    }

    await client.query("COMMIT");
    console.log("✅ store_settings table created with defaults");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

migrate();

"use strict";

require("dotenv").config();
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TEMP TABLE target_orders AS
      SELECT DISTINCT oi.order_id
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      WHERE p.is_active = false
    `);

    const targetOrdersRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM target_orders"
    );
    const targetOrders = targetOrdersRes.rows[0].count;

    if (targetOrders === 0) {
      await client.query("ROLLBACK");
      console.log("No orders found with inactive products. Nothing deleted.");
      return;
    }

    const invoiceCountRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM invoices i INNER JOIN target_orders t ON t.order_id = i.order_id"
    );
    const orderItemsCountRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM order_items oi INNER JOIN target_orders t ON t.order_id = oi.order_id"
    );

    const invoicesToDelete = invoiceCountRes.rows[0].count;
    const orderItemsToDelete = orderItemsCountRes.rows[0].count;

    const deleteInvoicesRes = await client.query(
      "DELETE FROM invoices i USING target_orders t WHERE i.order_id = t.order_id"
    );

    const deleteOrderItemsRes = await client.query(
      "DELETE FROM order_items oi USING target_orders t WHERE oi.order_id = t.order_id"
    );

    const deleteOrdersRes = await client.query(
      "DELETE FROM orders o USING target_orders t WHERE o.id = t.order_id"
    );

    await client.query("COMMIT");

    console.log("Deleted orders containing inactive products:");
    console.log(`- Target orders: ${targetOrders}`);
    console.log(`- Invoices deleted: ${deleteInvoicesRes.rowCount} (planned ${invoicesToDelete})`);
    console.log(`- Order items deleted: ${deleteOrderItemsRes.rowCount} (planned ${orderItemsToDelete})`);
    console.log(`- Orders deleted: ${deleteOrdersRes.rowCount}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Delete failed:", err.message);
  process.exit(1);
});

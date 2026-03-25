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

  const sql = `
    SELECT
      p.id,
      COALESCE(pt.name, '(no name)') AS product_name,
      p.sku,
      p.variant,
      p.unit_type,
      COUNT(DISTINCT oi.order_id) AS orders_count,
      SUM(oi.quantity) AS total_ordered_qty
    FROM products p
    JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN product_translations pt
      ON pt.product_id = p.id AND pt.lang_code = 'en'
    WHERE p.is_active = false
    GROUP BY p.id, pt.name, p.sku, p.variant, p.unit_type
    ORDER BY orders_count DESC, total_ordered_qty DESC;
  `;

  const { rows } = await pool.query(sql);

  if (!rows.length) {
    console.log("No inactive products with order history found in NEW DB.");
  } else {
    console.log("Inactive products with order history in NEW DB:");
    rows.forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.product_name} | id=${r.id} | sku=${r.sku || ""} | variant=${r.variant || ""} | unit=${r.unit_type || ""} | orders=${r.orders_count} | qty=${r.total_ordered_qty}`
      );
    });
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

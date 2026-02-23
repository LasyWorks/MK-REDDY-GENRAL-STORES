require("dotenv").config();
const { Client } = require("pg");

(async () => {
  const c = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  console.log("Connection OK");

  let r = await c.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  console.log("Tables:");
  r.rows.forEach((x) => console.log("  " + x.tablename));

  r = await c.query("SELECT count(*) as n FROM users");
  console.log("Users:", r.rows[0].n);

  r = await c.query("SELECT count(*) as n FROM products");
  console.log("Products:", r.rows[0].n);

  r = await c.query("SELECT count(*) as n FROM categories");
  console.log("Categories:", r.rows[0].n);

  await c.end();
})();

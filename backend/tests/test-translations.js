/**
 * Test: Language Translation System on Supabase
 * Verifies category & product translations in English and Telugu.
 */
require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✔ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ✘ FAIL: ${label}`);
    failed++;
  }
}

(async () => {
  await client.connect();
  console.log("Connected to Supabase\n");

  // ─────────────────────────────────────────────────
  // 1. Category Translations
  // ─────────────────────────────────────────────────
  console.log("═══ TEST GROUP 1: Category Translations ═══");

  // 1a. English translations exist
  const catEN = await client.query(
    `SELECT ct.name, ct.description
     FROM categories c
     JOIN category_translations ct ON c.id = ct.category_id AND ct.lang_code = 'en'
     ORDER BY c.display_order`,
  );
  assert(
    catEN.rows.length === 10,
    `All 10 categories have English translations (got ${catEN.rows.length})`,
  );
  assert(
    catEN.rows[0].name === "Cooking Oils",
    `First EN category = "Cooking Oils" (got "${catEN.rows[0].name}")`,
  );

  // 1b. Telugu translations exist
  const catTE = await client.query(
    `SELECT ct.name, ct.description
     FROM categories c
     JOIN category_translations ct ON c.id = ct.category_id AND ct.lang_code = 'te'
     ORDER BY c.display_order`,
  );
  assert(
    catTE.rows.length === 10,
    `All 10 categories have Telugu translations (got ${catTE.rows.length})`,
  );
  assert(
    catTE.rows[0].name === "వంట నూనెలు",
    `First TE category = "వంట నూనెలు" (got "${catTE.rows[0].name}")`,
  );

  // 1c. COALESCE fallback: request lang='te', should get Telugu name
  const catFallback = await client.query(
    `SELECT c.id,
            COALESCE(t_req.name, t_en.name) AS name,
            COALESCE(t_req.description, t_en.description) AS description
     FROM categories c
     LEFT JOIN category_translations t_req ON c.id = t_req.category_id AND t_req.lang_code = 'te'
     LEFT JOIN category_translations t_en  ON c.id = t_en.category_id  AND t_en.lang_code  = 'en'
     ORDER BY c.display_order`,
  );
  assert(
    catFallback.rows[0].name === "వంట నూనెలు",
    `COALESCE with lang=te returns Telugu name`,
  );

  // 1d. COALESCE fallback: unknown lang falls back to English
  const catUnknown = await client.query(
    `SELECT c.id,
            COALESCE(t_req.name, t_en.name) AS name
     FROM categories c
     LEFT JOIN category_translations t_req ON c.id = t_req.category_id AND t_req.lang_code = 'fr'
     LEFT JOIN category_translations t_en  ON c.id = t_en.category_id  AND t_en.lang_code  = 'en'
     ORDER BY c.display_order`,
  );
  assert(
    catUnknown.rows[0].name === "Cooking Oils",
    `Unknown lang "fr" falls back to English`,
  );

  // 1e. Check all 10 Telugu category names
  const expectedTECats = [
    "వంట నూనెలు",
    "బియ్యం & ధాన్యాలు",
    "పప్పులు",
    "మసాలాలు",
    "పిండి",
    "చక్కెర & ఉప్పు",
    "డ్రై ఫ్రూట్స్",
    "పానీయాలు",
    "పాల ఉత్పత్తులు",
    "స్నాక్స్",
  ];
  for (let i = 0; i < expectedTECats.length; i++) {
    assert(
      catTE.rows[i].name === expectedTECats[i],
      `Category[${i}] Telugu = "${expectedTECats[i]}" (got "${catTE.rows[i].name}")`,
    );
  }

  // ─────────────────────────────────────────────────
  // 2. Product Translations
  // ─────────────────────────────────────────────────
  console.log("\n═══ TEST GROUP 2: Product Translations ═══");

  // 2a. English product translations exist
  const prodEN = await client.query(
    `SELECT pt.name
     FROM products p
     JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'en'
     ORDER BY p.sku`,
  );
  assert(
    prodEN.rows.length === 18,
    `All 18 products have English translations (got ${prodEN.rows.length})`,
  );

  // 2b. Telugu product translations exist
  const prodTE = await client.query(
    `SELECT pt.name
     FROM products p
     JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'te'
     ORDER BY p.sku`,
  );
  assert(
    prodTE.rows.length === 18,
    `All 18 products have Telugu translations (got ${prodTE.rows.length})`,
  );

  // 2c. Specific product Telugu check
  const sunflower = await client.query(
    `SELECT pt.name
     FROM products p
     JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'te'
     WHERE p.sku = 'OIL001'`,
  );
  assert(
    sunflower.rows[0].name === "సన్ ఫ్లవర్ ఆయిల్",
    `OIL001 Telugu name = "సన్ ఫ్లవర్ ఆయిల్" (got "${sunflower.rows[0]?.name}")`,
  );

  // 2d. Full product join with COALESCE (simulates model query)
  const prodCoalesce = await client.query(
    `SELECT p.sku,
            COALESCE(pt_req.name, pt_en.name) AS name,
            COALESCE(ct_req.name, ct_en.name) AS category_name
     FROM products p
     JOIN categories c ON p.category_id = c.id
     LEFT JOIN product_translations pt_req  ON p.id = pt_req.product_id  AND pt_req.lang_code = 'te'
     LEFT JOIN product_translations pt_en   ON p.id = pt_en.product_id   AND pt_en.lang_code  = 'en'
     LEFT JOIN category_translations ct_req ON c.id = ct_req.category_id AND ct_req.lang_code = 'te'
     LEFT JOIN category_translations ct_en  ON c.id = ct_en.category_id  AND ct_en.lang_code  = 'en'
     ORDER BY p.sku`,
  );
  assert(
    prodCoalesce.rows.length === 18,
    `Full COALESCE join returns 18 products`,
  );
  assert(
    prodCoalesce.rows[0].name === "కాఫీ పొడి" ||
      prodCoalesce.rows.some((r) => r.name === "కాఫీ పొడి"),
    `Telugu product "కాఫీ పొడి" (Coffee Powder) found in results`,
  );
  assert(
    prodCoalesce.rows.some((r) => r.category_name === "వంట నూనెలు"),
    `Telugu category "వంట నూనెలు" (Cooking Oils) found in product join`,
  );

  // 2e. Check all Telugu product names
  const expectedTEProds = [
    { sku: "OIL001", te: "సన్ ఫ్లవర్ ఆయిల్" },
    { sku: "OIL002", te: "వేరుశనగ నూనె" },
    { sku: "OIL003", te: "కొబ్బరి నూనె" },
    { sku: "RIC001", te: "బాస్మతి బియ్యం" },
    { sku: "RIC002", te: "సోనా మసూరి" },
    { sku: "PUL001", te: "కంది పప్పు" },
    { sku: "PUL002", te: "పెసర పప్పు" },
    { sku: "SPI001", te: "పసుపు" },
    { sku: "SPI002", te: "కారం పొడి" },
    { sku: "FLR001", te: "గోధుమ పిండి" },
    { sku: "SUG001", te: "చక్కెర" },
    { sku: "SAL001", te: "ఉప్పు" },
    { sku: "DRY001", te: "బాదం" },
    { sku: "DRY002", te: "జీడిపప్పు" },
    { sku: "BEV001", te: "టీ పొడి" },
    { sku: "BEV002", te: "కాఫీ పొడి" },
    { sku: "DAI001", te: "నెయ్యి" },
    { sku: "SNK001", te: "బంగాళదుంప చిప్స్" },
  ];
  for (const { sku, te } of expectedTEProds) {
    const r = await client.query(
      `SELECT pt.name FROM products p
       JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'te'
       WHERE p.sku = $1`,
      [sku],
    );
    assert(
      r.rows[0]?.name === te,
      `Product ${sku} Telugu = "${te}" (got "${r.rows[0]?.name}")`,
    );
  }

  // ─────────────────────────────────────────────────
  // 3. Edge Cases
  // ─────────────────────────────────────────────────
  console.log("\n═══ TEST GROUP 3: Edge Cases ═══");

  // 3a. No duplicate translations
  const dupes = await client.query(
    `SELECT category_id, lang_code, COUNT(*) AS cnt
     FROM category_translations
     GROUP BY category_id, lang_code
     HAVING COUNT(*) > 1`,
  );
  assert(dupes.rows.length === 0, `No duplicate category translations`);

  const prodDupes = await client.query(
    `SELECT product_id, lang_code, COUNT(*) AS cnt
     FROM product_translations
     GROUP BY product_id, lang_code
     HAVING COUNT(*) > 1`,
  );
  assert(prodDupes.rows.length === 0, `No duplicate product translations`);

  // 3b. Every category has both en + te
  const catMissing = await client.query(
    `SELECT c.id
     FROM categories c
     WHERE NOT EXISTS (SELECT 1 FROM category_translations WHERE category_id = c.id AND lang_code = 'en')
        OR NOT EXISTS (SELECT 1 FROM category_translations WHERE category_id = c.id AND lang_code = 'te')`,
  );
  assert(
    catMissing.rows.length === 0,
    `All categories have both EN and TE translations`,
  );

  // 3c. Every product has both en + te
  const prodMissing = await client.query(
    `SELECT p.id
     FROM products p
     WHERE NOT EXISTS (SELECT 1 FROM product_translations WHERE product_id = p.id AND lang_code = 'en')
        OR NOT EXISTS (SELECT 1 FROM product_translations WHERE product_id = p.id AND lang_code = 'te')`,
  );
  assert(
    prodMissing.rows.length === 0,
    `All products have both EN and TE translations`,
  );

  // 3d. Unicode integrity — Telugu characters stored correctly
  const unicodeCheck = await client.query(
    `SELECT name FROM category_translations WHERE lang_code = 'te' AND name LIKE '%నూనె%'`,
  );
  assert(
    unicodeCheck.rows.length >= 1,
    `Telugu Unicode search (LIKE '%నూనె%') works — found ${unicodeCheck.rows.length} row(s)`,
  );

  // 3e. pg_trgm index on product_translations.name works
  const trigramCheck = await client.query(
    `SELECT name FROM product_translations WHERE name % 'పసుపు'`,
  );
  assert(
    trigramCheck.rows.length >= 1,
    `pg_trgm similarity search for "పసుపు" works — found ${trigramCheck.rows.length} row(s)`,
  );

  // ─────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────
  console.log(`\n${"═".repeat(50)}`);
  console.log(
    `  RESULTS:  ${passed} passed,  ${failed} failed,  ${passed + failed} total`,
  );
  console.log(`${"═".repeat(50)}\n`);

  await client.end();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error("Test script error:", err.message);
  process.exit(1);
});

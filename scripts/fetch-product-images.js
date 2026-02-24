/**
 * fetch-product-images.js
 *
 * Pre-fetches 4 SerpAPI images for every product that doesn't have them yet.
 *
 * Usage:
 *   node scripts/fetch-product-images.js            (processes all missing)
 *   node scripts/fetch-product-images.js --limit 20 (cap at 20 products)
 *   node scripts/fetch-product-images.js --dry-run  (preview only, no DB writes)
 *
 * API budget: 4 searches per product × 2 keys = 200 free searches → ~50 products.
 * The script shows running totals so you can stop before hitting limits.
 */

"use strict";

const { Pool } = require("pg");

// ── Config ────────────────────────────────────────────────────────────────

const SERP_KEYS = [
  "be50ad88f11c8421985ca58ed6aba42c9d1a17795bc3146098a7d2101a04f336",
  "2da01eeb0e240f2d21a61ac6c116ab1f564386923ec407c6ba360cf43b4bdc0e",
  "316b018d40533f406408edaf820c1a4a8a74fd27cb87171e399ecec71994cc1b",
].filter(Boolean);

const DB = {
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 5432,
  user: "postgres.fozaiesyhkasmveiymot",
  password: "PtVdVAZIDDVXJUaX",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  max: 3,
};

// Delay between products (ms) — keeps us well under rate limits
const DELAY_BETWEEN_PRODUCTS_MS = 1200;

// ── CLI args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
const DRY_RUN = args.includes("--dry-run");

// ── Helpers ───────────────────────────────────────────────────────────────

const pool = new Pool(DB);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch the single best image URL for a query string.
 * keyIndex rotates so we spread load across both keys.
 */
async function fetchOneImage(query, keyIndex) {
  const key = SERP_KEYS[keyIndex % SERP_KEYS.length];
  const url =
    `https://serpapi.com/search.json?engine=google_images` +
    `&q=${encodeURIComponent(query)}&num=3&ijn=0&api_key=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
    }
    const json = await res.json();
    const imgs = json.images_results || [];
    for (const img of imgs) {
      const src = img.original || img.thumbnail;
      if (src) return src;
    }
    return null;
  } catch (err) {
    console.error(`    ⚠  SerpAPI error for "${query}": ${err.message}`);
    return null;
  }
}

/**
 * Build the 4 targeted search queries for one product.
 */
function buildQueries(brand, name) {
  const base = [brand, name].filter(Boolean).join(" ");
  return [
    `${base} front`,
    `${base} back`,
    `${base} nutritional information table`,
    `${base} manufacturer contact FSSAI`,
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🛒  MK Reddy — Product Image Pre-fetcher");
  console.log("─".repeat(50));
  if (DRY_RUN) console.log("  DRY RUN — no DB writes");
  if (LIMIT !== Infinity) console.log(`  Limit: ${LIMIT} products`);

  // 1. Load products that need images
  const { rows: products } = await pool.query(`
    SELECT p.id, p.brand, pt.name
    FROM   products p
    JOIN   product_translations pt
           ON pt.product_id = p.id AND pt.lang_code = 'en'
    WHERE  p.is_active = TRUE
      AND  (p.image_urls IS NULL OR array_length(p.image_urls, 1) IS NULL OR array_length(p.image_urls, 1) < 4)
    ORDER  BY pt.name
  `);

  const total = Math.min(products.length, LIMIT === Infinity ? products.length : LIMIT);
  const apiCallsEstimate = total * 4;
  const keysAvail = SERP_KEYS.length;

  console.log(`\n  Products needing images : ${products.length}`);
  console.log(`  Will process            : ${total}`);
  console.log(`  SerpAPI calls needed    : ${apiCallsEstimate}  (${Math.ceil(apiCallsEstimate / keysAvail)} per key)`);
  console.log(`  Est. time               : ~${Math.ceil((total * (DELAY_BETWEEN_PRODUCTS_MS + 800)) / 1000)}s`);
  console.log("─".repeat(50) + "\n");

  let done = 0;
  let skipped = 0;
  let totalUrls = 0;

  for (let i = 0; i < total; i++) {
    const { id, brand, name } = products[i];
    const label = [brand, name].filter(Boolean).join(" – ");
    process.stdout.write(`[${i + 1}/${total}] ${label} … `);

    const queries = buildQueries(brand, name);

    // Run 4 searches in parallel, rotating across all keys (0→1→2→0)
    const results = await Promise.all(
      queries.map((q, idx) => fetchOneImage(q, idx))
    );

    // De-duplicate
    const seen = new Set();
    const urls = results.filter((u) => {
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    });

    if (urls.length === 0) {
      console.log("no images found, skipping");
      skipped++;
    } else {
      console.log(`${urls.length}/${queries.length} images`);
      totalUrls += urls.length;

      if (!DRY_RUN) {
        await pool.query("UPDATE products SET image_urls = $1 WHERE id = $2", [
          urls,
          id,
        ]);
      }
      done++;
    }

    // Throttle before next product
    if (i < total - 1) await sleep(DELAY_BETWEEN_PRODUCTS_MS);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`✅  Done!`);
  console.log(`   Products updated : ${done}`);
  console.log(`   Products skipped : ${skipped}`);
  console.log(`   Total URLs saved : ${totalUrls}`);
  console.log("─".repeat(50) + "\n");

  await pool.end();
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err.message);
  process.exit(1);
});

/**
 * fetch-product-images.js
 *
 * Pre-fetches 4 SerpAPI images for every product that has fewer than MIN_IMAGES.
 *
 * Usage:
 *   node scripts/fetch-product-images.js              (all products with < 2 images)
 *   node scripts/fetch-product-images.js --min 4      (only products with < 4 images)
 *   node scripts/fetch-product-images.js --limit 20   (cap at 20 products)
 *   node scripts/fetch-product-images.js --dry-run    (preview, no DB writes)
 *
 * Key handling:
 *   - Rotates across all 3 keys round-robin using only LIVE keys.
 *   - When a key returns HTTP 429 (or error body) it is permanently marked exhausted.
 *   - If ALL keys exhaust, the script prints a summary and exits cleanly.
 */

"use strict";

const { Pool } = require("pg");

// ── Config ─────────────────────────────────────────────────────────────────────

const ALL_KEYS = [
  // "be50ad88f11c8421985ca58ed6aba42c9d1a17795bc3146098a7d2101a04f336",
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

const DELAY_BETWEEN_PRODUCTS_MS = 1000;

// ── CLI args ───────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const minArg   = args.indexOf("--min");
const LIMIT    = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
// Default: skip products that already have ≥ 3 images
const MIN_IMAGES = minArg !== -1 ? parseInt(args[minArg + 1], 10) : 3;
const DRY_RUN  = args.includes("--dry-run");

// ── Key manager ────────────────────────────────────────────────────────────────

const exhausted = new Set();  // indices of dead keys
let   keyPointer = 0;         // round-robin pointer

/** Return the next live key index, or -1 if all exhausted. */
function nextLiveKey() {
  if (exhausted.size >= ALL_KEYS.length) return -1;
  let tries = 0;
  while (tries < ALL_KEYS.length) {
    const idx = keyPointer % ALL_KEYS.length;
    keyPointer++;
    if (!exhausted.has(idx)) return idx;
    tries++;
  }
  return -1;
}

/** Mark a key exhausted (once) with a visible warning. */
function markExhausted(keyIdx) {
  if (!exhausted.has(keyIdx)) {
    exhausted.add(keyIdx);
    const remaining = ALL_KEYS.length - exhausted.size;
    console.warn(`\n  ⛔  Key[${keyIdx}] exhausted (429). ${remaining} key(s) remaining.\n`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const pool = new Pool(DB);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch the best image URL for a query using the next live key. */
async function fetchOneImage(query) {
  const keyIdx = nextLiveKey();
  if (keyIdx === -1) return null;

  const key = ALL_KEYS[keyIdx];
  const url =
    `https://serpapi.com/search.json?engine=google_images` +
    `&q=${encodeURIComponent(query)}&num=3&ijn=0&api_key=${key}`;

  try {
    const res = await fetch(url);

    if (res.status === 429) { markExhausted(keyIdx); return null; }

    if (!res.ok) {
      const txt = await res.text();
      let parsed; try { parsed = JSON.parse(txt); } catch { parsed = null; }
      if (parsed?.error?.toLowerCase().includes("run out")) { markExhausted(keyIdx); return null; }
      console.warn(`    ⚠  [key${keyIdx}] HTTP ${res.status} for "${query}": ${txt.slice(0, 80)}`);
      return null;
    }

    const json = await res.json();
    if (json.error) {
      if (/run out|out of search/i.test(json.error)) { markExhausted(keyIdx); return null; }
      console.warn(`    ⚠  [key${keyIdx}] API error for "${query}": ${json.error}`);
      return null;
    }

    const imgs = json.images_results || [];
    for (const img of imgs) {
      const src = img.original || img.thumbnail;
      if (src) return src;
    }
    return null;

  } catch (err) {
    console.warn(`    ⚠  [key${keyIdx}] fetch error: ${err.message}`);
    return null;
  }
}

/** Build 4 targeted queries for a product. */
function buildQueries(brand, name) {
  // Avoid "No No.1 Soap" when brand is already embedded in name
  const base = (brand && !name.toLowerCase().startsWith(brand.toLowerCase()))
    ? `${brand} ${name}`
    : name;
  return [
    `${base} front view`,
    `${base} back view`,
    `${base} nutritional information table`,
    `${base} manufacturer contact FSSAI`,
  ];
}

function keyStatus() {
  return `(${ALL_KEYS.length - exhausted.size}/${ALL_KEYS.length} keys live)`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🛒  MK Reddy — Product Image Pre-fetcher");
  console.log("─".repeat(56));
  if (DRY_RUN)            console.log("  DRY RUN — no DB writes");
  if (LIMIT !== Infinity)  console.log(`  Limit    : ${LIMIT} products`);
  console.log(`  Min imgs : skipping products that already have ≥ ${MIN_IMAGES} image(s)`);

  const { rows: products } = await pool.query(`
    SELECT p.id, p.brand, pt.name,
           COALESCE(array_length(p.image_urls, 1), 0) AS img_count
    FROM   products p
    JOIN   product_translations pt
           ON pt.product_id = p.id AND pt.lang_code = 'en'
    WHERE  p.is_active = TRUE
      AND  (p.image_urls IS NULL
            OR array_length(p.image_urls, 1) IS NULL
            OR array_length(p.image_urls, 1) < $1)
    ORDER  BY pt.name
  `, [MIN_IMAGES]);

  const total = Math.min(products.length, LIMIT === Infinity ? products.length : LIMIT);

  console.log(`\n  Products needing images : ${products.length}`);
  console.log(`  Will process            : ${total}`);
  console.log(`  SerpAPI calls needed    : ~${total * 4}  ${keyStatus()}`);
  console.log(`  Est. time               : ~${Math.ceil((total * (DELAY_BETWEEN_PRODUCTS_MS + 800)) / 1000)}s`);
  console.log("─".repeat(56) + "\n");

  let done = 0, skipped = 0, totalUrls = 0;

  for (let i = 0; i < total; i++) {
    // Stop early if all keys are gone
    if (exhausted.size >= ALL_KEYS.length) {
      console.log("\n  ⛔  All SerpAPI keys exhausted — stopping early.");
      break;
    }

    const { id, brand, name, img_count } = products[i];
    const label = [brand, name].filter(Boolean).join(" – ");
    process.stdout.write(`[${i + 1}/${total}] ${label} (has ${img_count}) … `);

    const queries = buildQueries(brand, name);
    // Sequential — so a 429 on query N marks the key dead before query N+1 picks one
    const results = [];
    for (const q of queries) {
      if (exhausted.size >= ALL_KEYS.length) { results.push(null); continue; }
      results.push(await fetchOneImage(q));
    }

    // Merge new URLs into existing ones (preserve what's already saved)
    const { rows: cur } = await pool.query(
      "SELECT image_urls FROM products WHERE id = $1", [id]
    );
    const existing = cur[0]?.image_urls || [];
    const seen = new Set(existing);
    const merged = [...existing];
    for (const u of results) {
      if (u && !seen.has(u)) { seen.add(u); merged.push(u); }
    }
    const gained = merged.length - existing.length;

    if (gained === 0 && existing.length === 0) {
      console.log(`no images found  ${keyStatus()}`);
      skipped++;
    } else {
      console.log(`${merged.length} total (+${gained})  ${keyStatus()}`);
      totalUrls += gained;
      if (!DRY_RUN && gained > 0) {
        await pool.query("UPDATE products SET image_urls = $1 WHERE id = $2", [merged, id]);
      }
      if (gained > 0) done++; else skipped++;
    }

    if (i < total - 1) await sleep(DELAY_BETWEEN_PRODUCTS_MS);
  }

  console.log("\n" + "─".repeat(56));
  console.log(`✅  Done!`);
  console.log(`   Products updated : ${done}`);
  console.log(`   Products skipped : ${skipped}`);
  console.log(`   New URLs saved   : ${totalUrls}`);
  if (exhausted.size > 0)
    console.log(`   Keys exhausted  : ${exhausted.size}/${ALL_KEYS.length}`);
  console.log("─".repeat(56) + "\n");

  await pool.end();
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err.message);
  process.exit(1);
});

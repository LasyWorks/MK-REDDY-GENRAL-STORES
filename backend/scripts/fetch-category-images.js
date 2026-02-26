"use strict";
require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10) || 5432,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 3,
});
const ALL_KEYS = [
  process.env.SERPAPI_KEY,
  process.env.SERPAPI_KEY_2,
  process.env.SERPAPI_KEY_3,
].filter(Boolean);
const exhausted = new Set();
let keyPointer = 0;
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
function markExhausted(idx) {
  if (!exhausted.has(idx)) {
    exhausted.add(idx);
    const rem = ALL_KEYS.length - exhausted.size;
    console.warn(`\n  ⛔  Key[${idx}] exhausted (429/limit). ${rem} key(s) remaining.\n`);
  }
}
function keyStatus() {
  return `(${ALL_KEYS.length - exhausted.size}/${ALL_KEYS.length} keys live)`;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function buildQuery(name, parentName) {
  const base = parentName ? `${parentName} ${name}` : name;
  return `${base} grocery product india`;
}
async function fetchImage(query, _attempt = 0) {
  if (_attempt >= ALL_KEYS.length) return null; 
  const keyIdx = nextLiveKey();
  if (keyIdx === -1) return null;
  const key = ALL_KEYS[keyIdx];
  const url =
    `https://serpapi.com/search.json?engine=google_images` +
    `&q=${encodeURIComponent(query)}&num=5&ijn=0&api_key=${key}`;
  try {
    const res = await fetch(url);
    if (res.status === 429) {
      markExhausted(keyIdx);
      return fetchImage(query, _attempt + 1);
    }
    if (!res.ok) {
      const txt = await res.text();
      let parsed; try { parsed = JSON.parse(txt); } catch { parsed = null; }
      if (parsed?.error?.toLowerCase().includes("run out")) {
        markExhausted(keyIdx);
        return fetchImage(query, _attempt + 1);
      }
      console.warn(`    ⚠  HTTP ${res.status} for "${query}"`);
      return null;
    }
    const json = await res.json();
    if (json.error) {
      if (/run out|out of search/i.test(json.error)) {
        markExhausted(keyIdx);
        return fetchImage(query, _attempt + 1);
      }
      console.warn(`    ⚠  API error for "${query}": ${json.error}`);
      return null;
    }
    const imgs = json.images_results || [];
    for (const img of imgs) {
      const src = img.original;
      if (src && !src.startsWith("data:")) return src;
    }
    for (const img of imgs) {
      const src = img.thumbnail;
      if (src && !src.startsWith("data:")) return src;
    }
    return null;
  } catch (err) {
    console.warn(`    ⚠  fetch error: ${err.message}`);
    return null;
  }
}
async function main() {
  const args    = process.argv.slice(2);
  const OVERWRITE = args.includes("--all");
  const DRY_RUN   = args.includes("--dry-run");
  const limitArg  = args.indexOf("--limit");
  const LIMIT     = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
  console.log("\n🏪  MK Reddy — Category Image Fetcher");
  console.log("─".repeat(52));
  if (DRY_RUN)  console.log("  DRY RUN — no DB writes");
  if (OVERWRITE) console.log("  Mode    : overwrite ALL (--all)");
  else           console.log("  Mode    : missing only (use --all to overwrite)");
  const { rows } = await pool.query(`
    SELECT
      c.id,
      c.parent_id,
      c.image_url,
      t.name,
      tp.name AS parent_name
    FROM categories c
    LEFT JOIN category_translations t  ON t.category_id  = c.id        AND t.lang_code = 'en'
    LEFT JOIN categories            cp ON cp.id           = c.parent_id
    LEFT JOIN category_translations tp ON tp.category_id = cp.id       AND tp.lang_code = 'en'
    ORDER BY c.parent_id NULLS FIRST, t.name
  `);
  const targets = OVERWRITE
    ? rows
    : rows.filter((r) => !r.image_url);
  const total = LIMIT === Infinity ? targets.length : Math.min(targets.length, LIMIT);
  const roots = targets.filter((r) => !r.parent_id).length;
  const subs  = targets.filter((r) =>  r.parent_id).length;
  console.log(`\n  Categories to process : ${total} (${roots} root, ${subs} sub)`);
  console.log(`  SerpAPI keys          : ${ALL_KEYS.length}`);
  console.log("─".repeat(52) + "\n");
  if (total === 0) {
    console.log("  ✅  All categories already have images! Use --all to refresh.\n");
    await pool.end();
    return;
  }
  let done = 0, skipped = 0;
  for (let i = 0; i < total; i++) {
    if (exhausted.size >= ALL_KEYS.length) {
      console.log("\n  ⛔  All SerpAPI keys exhausted — stopping early.");
      break;
    }
    const cat = targets[i];
    const label = cat.parent_name ? `${cat.parent_name} › ${cat.name}` : cat.name;
    process.stdout.write(`[${i + 1}/${total}] ${label} … `);
    const query = buildQuery(cat.name, cat.parent_name);
    const imageUrl = await fetchImage(query);
    if (!imageUrl) {
      console.log(`no image found  ${keyStatus()}`);
      skipped++;
    } else {
      const preview = imageUrl.length > 60 ? imageUrl.slice(0, 57) + "…" : imageUrl;
      console.log(`✓  ${preview}  ${keyStatus()}`);
      if (!DRY_RUN) {
        await pool.query(
          "UPDATE categories SET image_url = $1 WHERE id = $2",
          [imageUrl, cat.id]
        );
      }
      done++;
    }
    if (i < total - 1) await sleep(800);
  }
  console.log("\n" + "─".repeat(52));
  console.log(`✅  Done!`);
  console.log(`   Updated : ${done}`);
  console.log(`   Skipped : ${skipped} (no image found)`);
  if (exhausted.size > 0)
    console.log(`   Keys exhausted : ${exhausted.size}/${ALL_KEYS.length}`);
  console.log("─".repeat(52) + "\n");
  await pool.end();
}
main().catch((err) => {
  console.error("\n❌  Fatal:", err.message);
  process.exit(1);
});
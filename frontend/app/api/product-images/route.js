import { NextResponse } from "next/server";
import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const SERP_KEYS = [
  process.env.SERPAPI_KEY,
  process.env.SERPAPI_KEY_2,
  process.env.SERPAPI_KEY_3,
].filter(Boolean);
async function fetchOneImage(query, keyIndex = 0) {
  const key = SERP_KEYS[keyIndex % SERP_KEYS.length];
  const url =
    `https://serpapi.com/search.json?engine=google_images` +
    `&q=${encodeURIComponent(query)}&num=3&ijn=0&api_key=${key}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const imgs = json.images_results || [];
    for (const img of imgs) {
      const src = img.original || img.thumbnail;
      if (src) return src;
    }
  } catch {
  }
  return null;
}
function buildQueries(brand, name) {
  const base = [brand, name].filter(Boolean).join(" ");
  return [
    `${base} front`,                             
    `${base} back`,                              
    `${base} nutritional information table`,     
    `${base} manufacturer contact FSSAI`,        
  ];
}
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("id");
  const name     = searchParams.get("name")  || "";
  const brand    = searchParams.get("brand") || "";
  if (!productId) {
    return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  }
  try {
    const existing = await pool.query(
      "SELECT image_urls FROM products WHERE id = $1",
      [productId]
    );
    const saved = existing.rows[0]?.image_urls || [];
    if (saved.length >= 4) {
      return NextResponse.json({ urls: saved });
    }
  } catch (_) {
  }
  const queries = buildQueries(brand, name);
  const results = await Promise.all(
    queries.map((q, i) => fetchOneImage(q, i % 2))  
  );
  const seen = new Set();
  const urls = results.filter((u) => {
    if (!u || seen.has(u)) return false;
    seen.add(u);
    return true;
  });
  if (urls.length === 0) {
    return NextResponse.json({ urls: [] });
  }
  try {
    await pool.query(
      "UPDATE products SET image_urls = $1 WHERE id = $2",
      [urls, productId]
    );
  } catch (err) {
    console.error("Failed to save image_urls:", err.message);
  }
  return NextResponse.json({ urls });
}
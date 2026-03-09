/**
 * MK Reddy General Stores — Category Seed Script
 *
 * Creates the full Indian kirana-store category hierarchy:
 *   Parent Category → Sub-categories
 *
 * Safe to run multiple times — skips categories that already exist by name.
 *
 * Usage:
 *   cd backend
 *   npm run seed:categories
 */

const { Pool } = require("pg");
const path    = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// ─── Full Category Hierarchy ──────────────────────────────────────────────────
// Each parent has an array of subcategories.
// `defaultUnit` is stored alongside the name (Telugu translation is auto-set).
const CATEGORIES = [
  {
    name: "Bulk & Loose Items",
    icon: "⚖️",
    order: 1,
    subs: [
      { name: "Rice & Cereals",       order: 1 },
      { name: "Wheat, Atta & Sooji",  order: 2 },
      { name: "Dal & Pulses",         order: 3 },
      { name: "Cooking Oil & Ghee",   order: 4 },
      { name: "Sugar, Salt & Jaggery", order: 5 },
      { name: "Spices & Masala",      order: 6 },
      { name: "Dry Fruits & Nuts",    order: 7 },
      { name: "Tamarind & Condiments", order: 8 },
    ],
  },
  {
    name: "Beverages",
    icon: "☕",
    order: 2,
    subs: [
      { name: "Tea & Coffee",                    order: 1 },
      { name: "Cold Drinks & Aerated Beverages", order: 2 },
      { name: "Juices & Fruit Drinks",           order: 3 },
      { name: "Health Drinks & Malt",            order: 4 },
      { name: "Packaged Drinking Water",         order: 5 },
      { name: "Energy Drinks",                   order: 6 },
    ],
  },
  {
    name: "Snacks & Packaged Food",
    icon: "🍪",
    order: 3,
    subs: [
      { name: "Biscuits & Cookies",              order: 1 },
      { name: "Chips & Namkeen",                 order: 2 },
      { name: "Dry Fruits & Nuts",               order: 3 },
      { name: "Chocolates & Sweets",             order: 4 },
      { name: "Noodles, Pasta & Vermicelli",     order: 5 },
      { name: "Ready-to-Eat & Instant Food",     order: 6 },
    ],
  },
  {
    name: "Dairy, Bread & Eggs",
    icon: "🥛",
    order: 4,
    subs: [
      { name: "Milk & Curd",                     order: 1 },
      { name: "Butter & Cheese",                 order: 2 },
      { name: "Bread & Bakery",                  order: 3 },
      { name: "Paneer & Khoya",                  order: 4 },
      { name: "Eggs",                            order: 5 },
      { name: "Ice Cream & Frozen Desserts",     order: 6 },
    ],
  },
  {
    name: "Personal Care & Hygiene",
    icon: "🧴",
    order: 5,
    subs: [
      { name: "Soaps & Body Wash",               order: 1 },
      { name: "Shampoo & Conditioner",           order: 2 },
      { name: "Toothpaste & Oral Care",          order: 3 },
      { name: "Skin Care & Lotions",             order: 4 },
      { name: "Feminine Hygiene",                order: 5 },
      { name: "Hair Oil & Styling",              order: 6 },
    ],
  },
  {
    name: "Household & Cleaning",
    icon: "🧹",
    order: 6,
    subs: [
      { name: "Detergents & Washing",            order: 1 },
      { name: "Dishwash & Kitchen Cleaning",     order: 2 },
      { name: "Floor, Toilet & Bathroom Cleaners", order: 3 },
      { name: "Air Fresheners & Repellents",     order: 4 },
      { name: "Garbage Bags & Wraps",            order: 5 },
      { name: "Wipes & Paper Products",          order: 6 },
    ],
  },
  {
    name: "Fruits & Vegetables",
    icon: "🥦",
    order: 7,
    subs: [
      { name: "Fresh Vegetables",                order: 1 },
      { name: "Fresh Fruits",                    order: 2 },
      { name: "Herbs & Leafy Greens",            order: 3 },
    ],
  },
  {
    name: "Baby & Kids Care",
    icon: "🍼",
    order: 8,
    subs: [
      { name: "Baby Food & Formula",             order: 1 },
      { name: "Diapers & Wipes",                 order: 2 },
      { name: "Baby Skin & Hair Care",           order: 3 },
    ],
  },
  {
    name: "Stationery & General",
    icon: "✏️",
    order: 9,
    subs: [
      { name: "Stationery & Writing",            order: 1 },
      { name: "Batteries & Small Electronics",   order: 2 },
      { name: "Pooja & Agarbathi",               order: 3 },
      { name: "General Merchandise",             order: 4 },
    ],
  },
];

// Simple Telugu name mapping (phonetic transliterations for common category names)
const TELUGU_NAMES = {
  "Bulk & Loose Items":                  "బల్క్ & లూజ్ వస్తువులు",
  "Rice & Cereals":                      "బియ్యం & ధాన్యాలు",
  "Wheat, Atta & Sooji":                 "గోధుమ, అట్ట & సూజి",
  "Dal & Pulses":                        "పప్పులు & కాయగూరలు",
  "Cooking Oil & Ghee":                  "వంట నూనె & నెయ్యి",
  "Sugar, Salt & Jaggery":              "పంచదార, ఉప్పు & బెల్లం",
  "Spices & Masala":                     "సుగంధ ద్రవ్యాలు & మసాలా",
  "Dry Fruits & Nuts":                   "డ్రై ఫ్రూట్స్ & నట్స్",
  "Tamarind & Condiments":               "చింతపండు & మసాలాలు",
  "Beverages":                           "పానీయాలు",
  "Tea & Coffee":                        "టీ & కాఫీ",
  "Cold Drinks & Aerated Beverages":     "కోల్డ్ డ్రింక్స్",
  "Juices & Fruit Drinks":               "రసాలు & పండ్ల పానీయాలు",
  "Health Drinks & Malt":                "ఆరోగ్య పానీయాలు",
  "Packaged Drinking Water":             "బాటిల్ నీళ్ళు",
  "Energy Drinks":                       "ఎనర్జీ డ్రింక్స్",
  "Snacks & Packaged Food":              "స్నాక్స్ & ప్యాక్ చేసిన ఆహారం",
  "Biscuits & Cookies":                  "బిస్కట్లు & కుకీలు",
  "Chips & Namkeen":                     "చిప్స్ & నమ్కీన్",
  "Dry Fruits & Nuts":                   "డ్రై ఫ్రూట్స్ & నట్స్",
  "Chocolates & Sweets":                 "చాక్లెట్లు & స్వీట్లు",
  "Noodles, Pasta & Vermicelli":         "నూడుల్స్ & పాస్తా",
  "Ready-to-Eat & Instant Food":         "రెడీ-టు-ఈట్ ఆహారం",
  "Dairy, Bread & Eggs":                 "పాల ఉత్పత్తులు, బ్రెడ్ & గుడ్లు",
  "Milk & Curd":                         "పాలు & పెరుగు",
  "Butter & Cheese":                     "వెన్న & చీజ్",
  "Bread & Bakery":                      "బ్రెడ్ & బేకరీ",
  "Paneer & Khoya":                      "పనీర్ & ఖోయా",
  "Eggs":                                "గుడ్లు",
  "Ice Cream & Frozen Desserts":         "ఐస్ క్రీమ్",
  "Personal Care & Hygiene":             "వ్యక్తిగత సంరక్షణ",
  "Soaps & Body Wash":                   "సబ్బులు & బాడీ వాష్",
  "Shampoo & Conditioner":               "షాంపూ & కండిషనర్",
  "Toothpaste & Oral Care":              "టూత్‌పేస్ట్ & నోటి సంరక్షణ",
  "Skin Care & Lotions":                 "స్కిన్ కేర్ & లోషన్లు",
  "Feminine Hygiene":                    "మహిళా పరిశుభ్రత",
  "Hair Oil & Styling":                  "హెయిర్ ఆయిల్ & స్టైలింగ్",
  "Household & Cleaning":                "గృహ సంరక్షణ & శుభ్రపరచడం",
  "Detergents & Washing":                "డిటర్జెంట్లు",
  "Dishwash & Kitchen Cleaning":         "పాత్రల శుభ్రత",
  "Floor, Toilet & Bathroom Cleaners":   "ఫ్లోర్ & టాయిలెట్ క్లీనర్",
  "Air Fresheners & Repellents":         "ఎయిర్ ఫ్రెషనర్ & రిపెల్లెంట్",
  "Garbage Bags & Wraps":                "చెత్త సంచులు",
  "Wipes & Paper Products":              "వైప్స్ & పేపర్ ఉత్పత్తులు",
  "Fruits & Vegetables":                 "పండ్లు & కూరగాయలు",
  "Fresh Vegetables":                    "తాజా కూరగాయలు",
  "Fresh Fruits":                        "తాజా పండ్లు",
  "Herbs & Leafy Greens":                "ఆకుకూరలు & మూలికలు",
  "Baby & Kids Care":                    "శిశు సంరక్షణ",
  "Baby Food & Formula":                 "శిశు ఆహారం",
  "Diapers & Wipes":                     "డైపర్లు & వైప్స్",
  "Baby Skin & Hair Care":               "శిశు చర్మ సంరక్షణ",
  "Stationery & General":                "స్టేషనరీ & సాధారణ వస్తువులు",
  "Stationery & Writing":                "స్టేషనరీ & రాత సామాగ్రి",
  "Batteries & Small Electronics":       "బ్యాటరీలు & చిన్న ఎలక్ట్రానిక్స్",
  "Pooja & Agarbathi":                   "పూజా సామాగ్రి & అగరబత్తులు",
  "General Merchandise":                 "సాధారణ వస్తువులు",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getExistingNames() {
  const res = await pool.query(
    `SELECT ct.name FROM category_translations ct WHERE ct.lang_code = 'en'`
  );
  return new Set(res.rows.map((r) => r.name.trim().toLowerCase()));
}

async function insertCategory(name, parentId, order) {
  const telName = TELUGU_NAMES[name] || null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Insert base category row
    const catRes = await client.query(
      `INSERT INTO categories (parent_id, display_order, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING id`,
      [parentId || null, order]
    );
    const catId = catRes.rows[0].id;
    // English translation
    await client.query(
      `INSERT INTO category_translations (category_id, lang_code, name)
       VALUES ($1, 'en', $2)`,
      [catId, name]
    );
    // Telugu translation (if available)
    if (telName) {
      await client.query(
        `INSERT INTO category_translations (category_id, lang_code, name)
         VALUES ($1, 'te', $2)`,
        [catId, telName]
      );
    }
    await client.query("COMMIT");
    return catId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🏪 MK Reddy General Stores — Category Seed");
  console.log("─".repeat(52));

  let existing;
  try {
    existing = await getExistingNames();
    console.log(`ℹ️  Found ${existing.size} existing category names — skipping duplicates\n`);
  } catch (err) {
    console.error("❌ Could not connect to database:", err.message);
    process.exit(1);
  }

  let createdParents = 0;
  let createdSubs    = 0;
  let skipped        = 0;

  for (const cat of CATEGORIES) {
    let parentId;

    if (existing.has(cat.name.toLowerCase())) {
      // Fetch existing parent id so we can still create missing sub-categories
      const res = await pool.query(
        `SELECT c.id FROM categories c
         JOIN category_translations ct ON ct.category_id = c.id
         WHERE ct.lang_code = 'en' AND LOWER(ct.name) = $1
         LIMIT 1`,
        [cat.name.toLowerCase()]
      );
      parentId = res.rows[0]?.id;
      console.log(`  ⏭  "${cat.name}" already exists — using id ${parentId}`);
      skipped++;
    } else {
      parentId = await insertCategory(cat.name, null, cat.order);
      console.log(`  ✅ Created parent: "${cat.name}"`);
      createdParents++;
      existing.add(cat.name.toLowerCase());
    }

    // Subcategories
    for (const sub of cat.subs) {
      if (existing.has(sub.name.toLowerCase())) {
        console.log(`      ⏭  Sub "${sub.name}" already exists`);
        skipped++;
        continue;
      }
      await insertCategory(sub.name, parentId, sub.order);
      console.log(`      ✅ Sub: "${sub.name}"`);
      createdSubs++;
      existing.add(sub.name.toLowerCase());
    }
  }

  console.log("\n" + "─".repeat(52));
  console.log(`✅ Done!`);
  console.log(`   Created : ${createdParents} parent categories, ${createdSubs} sub-categories`);
  console.log(`   Skipped : ${skipped} (already existed)`);
  console.log(`   Total   : ${createdParents + createdSubs} new rows\n`);

  await pool.end();
}

seed().catch((err) => {
  console.error("💥 Seed failed:", err.message);
  process.exit(1);
});

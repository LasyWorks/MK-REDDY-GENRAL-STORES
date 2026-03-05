// ─────────────────────────────────────────────────────────────────
// voiceSearch.js  –  Shared helpers for accurate voice search
// ─────────────────────────────────────────────────────────────────

/**
 * Telugu → English grocery dictionary.
 * Keys are lowercase Telugu words (or common phonetic spellings Chrome returns).
 * Covers 120+ everyday grocery items sold in Andhra/Telangana kirana stores.
 */
export const TELUGU_DICT = {
  // ── Staples ──────────────────────────────────────────────────
  "బియ్యం": "rice",
  "అన్నం": "rice",
  "రైస్": "rice",
  "గోధుమ": "wheat",
  "గోధుమలు": "wheat",
  "పిండి": "flour",
  "గోధుమ పిండి": "wheat flour",
  "మైదా": "maida flour",
  "రవ్వ": "rava semolina",
  "సూజి": "suji semolina",
  "పోహ": "poha flattened rice",
  "అటుకులు": "poha",

  // ── Pulses / Dal ──────────────────────────────────────────────
  "పప్పు": "dal lentils",
  "కంది పప్పు": "toor dal",
  "కందులు": "toor dal",
  "పెసలు": "moong dal",
  "పెసర పప్పు": "moong dal",
  "మినపలు": "urad dal",
  "మినప పప్పు": "urad dal",
  "చనగలు": "chana dal",
  "శనగలు": "chickpeas chana",
  "శనగ పప్పు": "chana dal",
  "రాజమ": "rajma kidney beans",
  "మసూరి పప్పు": "masoor dal",

  // ── Oils ──────────────────────────────────────────────────────
  "నూనె": "oil",
  "వంట నూనె": "cooking oil",
  "సూర్యకాంతి నూనె": "sunflower oil",
  "పల్లీ నూనె": "groundnut oil",
  "కొబ్బరి నూనె": "coconut oil",
  "ఆవాల నూనె": "mustard oil",
  "నువ్వుల నూనె": "sesame oil",
  "రైస్ బ్రాన్ నూనె": "rice bran oil",

  // ── Dairy ─────────────────────────────────────────────────────
  "పాలు": "milk",
  "పాల": "milk",
  "పెరుగు": "curd yogurt",
  "దధి": "curd",
  "వెన్న": "butter",
  "నెయ్యి": "ghee",
  "చీజ్": "cheese",
  "బనానా": "banana",
  "క్రీమ్": "cream",
  "పాల పొడి": "milk powder",

  // ── Vegetables ───────────────────────────────────────────────
  "టొమాటో": "tomato",
  "టమాటా": "tomato",
  "ఆలూ": "potato",
  "బంగాళాదుంప": "potato",
  "ఉల్లిపాయ": "onion",
  "ఉల్లి": "onion",
  "వెల్లుల్లి": "garlic",
  "అల్లం": "ginger",
  "మిర్చి": "chilli",
  "కారం": "chilli powder",
  "పచ్చి మిర్చి": "green chilli",
  "కాప్సికం": "capsicum",
  "వంకాయ": "brinjal eggplant",
  "బెండకాయ": "okra ladyfinger",
  "కాకర": "bitter gourd",
  "దోసకాయ": "cucumber",
  "గోర్కాయ": "ridge gourd",
  "పీచు": "beans",
  "క్యారెట్": "carrot",
  "బఠానీ": "peas",
  "పచ్చి బఠానీ": "green peas",
  "పాలకూర": "spinach palak",
  "మెంతికూర": "fenugreek methi",
  "కొత్తిమీర": "coriander",
  "పుదీనా": "mint",
  "కరివేపాకు": "curry leaves",

  // ── Fruits ───────────────────────────────────────────────────
  "అరటిపండు": "banana",
  "అరటి": "banana",
  "మామిడి": "mango",
  "పుచ్చకాయ": "watermelon",
  "ద్రాక్ష": "grapes",
  "యాపిల్": "apple",
  "నారంగి": "orange",
  "నిమ్మ": "lemon",
  "నిమ్మకాయ": "lemon",
  "పైనాపిల్": "pineapple",
  "పోమేగ్రనేట్": "pomegranate",

  // ── Spices ───────────────────────────────────────────────────
  "మిర్చి పొడి": "red chilli powder",
  "పసుపు": "turmeric",
  "పసుపు పొడి": "turmeric powder",
  "జీర": "jeera cumin",
  "జీలకర్ర": "cumin seeds",
  "ధనియాలు": "coriander seeds",
  "ధనియా పొడి": "coriander powder",
  "గరం మసాల": "garam masala",
  "మసాల": "masala",
  "ఆవాలు": "mustard seeds",
  "మెంతులు": "fenugreek seeds",
  "అనాసపువ్వు": "star anise",
  "లవంగాలు": "cloves",
  "దాల్చిన చెక్క": "cinnamon",
  "ఏలకులు": "cardamom",
  "సోంపు": "fennel seeds",
  "కారం పొడి": "chilli powder",

  // ── Sugar / Salt / Sweeteners ─────────────────────────────────
  "చక్కెర": "sugar",
  "బెల్లం": "jaggery",
  "ఉప్పు": "salt",
  "మిరియాలు": "black pepper",

  // ── Snacks ───────────────────────────────────────────────────
  "బిస్కెట్": "biscuit",
  "చిప్స్": "chips",
  "నమ్కీన్": "namkeen snacks",
  "పప్పడం": "papad",
  "ముఖ్వాస్": "mouth freshener",
  "మిఠాయి": "sweets",
  "చాక్లెట్": "chocolate",

  // ── Beverages ─────────────────────────────────────────────────
  "టీ": "tea",
  "కాఫీ": "coffee",
  "టీ పొడి": "tea powder",
  "హోర్లిక్స్": "horlicks",
  "బోర్న్‌విటా": "bournvita",
  "జ్యూస్": "juice",
  "నీళ్ళు": "water",
  "కోల్డ్ డ్రింక్": "cold drink",

  // ── Household / Cleaning ──────────────────────────────────────
  "సబ్బు": "soap",
  "డిటర్జెంట్": "detergent",
  "సర్ఫ్": "surf detergent",
  "బ్రష్": "brush",
  "టూత్ పేస్ట్": "toothpaste",
  "షాంపూ": "shampoo",
  "బాడీ వాష్": "body wash",

  // ── Eggs / Meat ───────────────────────────────────────────────
  "గుడ్లు": "eggs",
  "గుడ్డు": "egg",
  "చికెన్": "chicken",
  "మటన్": "mutton",
  "చేపలు": "fish",
  "ఝింగా": "prawns",

  // ── Bread / Bakery ────────────────────────────────────────────
  "బ్రెడ్": "bread",
  "పావు": "bread pav",

  // ── Noodles / Pasta ───────────────────────────────────────────
  "నూడిల్స్": "noodles",
  "పాస్తా": "pasta",
  "మాగి": "maggi noodles",

  // ── Packed / Canned ───────────────────────────────────────────
  "కెచప్": "ketchup tomato sauce",
  "సాస్": "sauce",
  "అచార్": "pickle",
  "ఊరగాయ": "pickle achar",
  "జాం": "jam",
  "హనీ": "honey",
  "తేనె": "honey",
  "వినెగర్": "vinegar",

  // ── Baby / Health ─────────────────────────────────────────────
  "సెరెలాక్": "cerelac baby food",
  "పాల పొడి": "milk powder",
  "ఓట్స్": "oats",
  "కార్న్‌ఫ్లేక్స్": "cornflakes",
};

/**
 * Normalize a transcript string:
 * - lowercase, trim
 * - strip trailing punctuation Chrome adds ("milk." → "milk")
 * - collapse extra whitespace
 */
export function normalizeTranscript(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fast local lookup: exact key match or starts-with match in TELUGU_DICT.
 * Returns the English value or null.
 */
export function dictLookup(text) {
  const norm = normalizeTranscript(text);
  if (TELUGU_DICT[norm]) return TELUGU_DICT[norm];
  // partial match: if spoken word appears as a key prefix
  for (const [key, val] of Object.entries(TELUGU_DICT)) {
    if (norm.includes(key) || key.includes(norm)) return val;
  }
  return null;
}

/**
 * Full translate pipeline:
 * 1. Normalize text
 * 2. Try local dictionary first (instant, offline)
 * 3. Fall back to Google Translate free API
 */
export async function translateToEnglish(text, srcLang) {
  const norm = normalizeTranscript(text);
  if (!norm || srcLang === "en-IN") return norm || text;

  // 1. Local dictionary — instant
  const local = dictLookup(norm);
  if (local) return local;

  // 2. Google Translate fallback
  try {
    const sl = srcLang === "te-IN" ? "te" : "auto";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=en&dt=t&q=${encodeURIComponent(norm)}`;
    const res = await fetch(url);
    const json = await res.json();
    const translated = json?.[0]
      ?.map((item) => item?.[0] || "")
      .join("")
      .trim();
    return normalizeTranscript(translated || norm);
  } catch {
    return norm;
  }
}

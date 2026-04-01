// ─────────────────────────────────────────────────────────────────
// voiceSearch.js  –  Shared helpers for accurate voice search
// ─────────────────────────────────────────────────────────────────

// Runtime dictionary comes from backend settings.

const VOICE_DICT_API =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1") +
  "/settings/voice-dictionary?lang=te";
const VOICE_DICT_CACHE_KEY = "mk_voice_dict_te_v1";
const VOICE_DICT_CACHE_TS_KEY = "mk_voice_dict_te_v1_ts";
const VOICE_DICT_TTL_MS = 24 * 60 * 60 * 1000;

let ACTIVE_TELUGU_DICT = {};
let dictLoadPromise = null;

function normalizeDictObject(dict) {
  const normalized = {};
  if (!dict || typeof dict !== "object") return normalized;
  for (const [k, v] of Object.entries(dict)) {
    if (typeof k !== "string" || typeof v !== "string") continue;
    const nk = k.trim().toLowerCase();
    const nv = v.trim().toLowerCase();
    if (!nk || !nv) continue;
    normalized[nk] = nv;
  }
  return normalized;
}

function setActiveDictionary(remoteDict = {}) {
  ACTIVE_TELUGU_DICT = normalizeDictObject(remoteDict);
}

export async function loadDynamicTeluguDict(force = false) {
  if (typeof window === "undefined") return ACTIVE_TELUGU_DICT;
  if (!force && dictLoadPromise) return dictLoadPromise;

  dictLoadPromise = (async () => {
    // 1) Use fresh cache first for instant UX
    if (!force) {
      try {
        const cachedRaw = localStorage.getItem(VOICE_DICT_CACHE_KEY);
        const cachedTs = parseInt(
          localStorage.getItem(VOICE_DICT_CACHE_TS_KEY) || "0",
          10,
        );
        if (cachedRaw && Date.now() - cachedTs < VOICE_DICT_TTL_MS) {
          const cached = JSON.parse(cachedRaw);
          setActiveDictionary(cached);
        }
      } catch {
        // Ignore cache parse errors
      }
    }

    // 2) Fetch latest dictionary from backend settings
    try {
      const res = await fetch(VOICE_DICT_API, { cache: "no-store" });
      if (!res.ok) return ACTIVE_TELUGU_DICT;
      const json = await res.json();
      const remote = json?.data?.dictionary || {};
      const normalized = normalizeDictObject(remote);
      setActiveDictionary(normalized);

      try {
        localStorage.setItem(VOICE_DICT_CACHE_KEY, JSON.stringify(normalized));
        localStorage.setItem(VOICE_DICT_CACHE_TS_KEY, String(Date.now()));
      } catch {
        // Ignore storage write errors
      }
    } catch {
      // Keep last known in-memory/cache dictionary if network fails
    }

    return ACTIVE_TELUGU_DICT;
  })();

  try {
    return await dictLoadPromise;
  } finally {
    dictLoadPromise = null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("voiceDictionaryUpdated", () => {
    // Fire-and-forget refresh so new mappings become active immediately.
    loadDynamicTeluguDict(true).catch(() => {});
  });
}

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
 * Fast local lookup: exact key match or starts-with match in active dictionary.
 * Returns the English value or null.
 */
export function dictLookup(text) {
  const norm = normalizeTranscript(text);
  if (ACTIVE_TELUGU_DICT[norm]) return ACTIVE_TELUGU_DICT[norm];
  // partial match: if spoken word appears as a key prefix
  for (const [key, val] of Object.entries(ACTIVE_TELUGU_DICT)) {
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

  // Load dynamic dictionary before Telugu lookup.
  if (srcLang === "te-IN" || /[\u0C00-\u0C7F]/.test(norm)) {
    await loadDynamicTeluguDict();
  }

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

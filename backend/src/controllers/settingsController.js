const StoreSetting = require("../models/StoreSetting");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");

// Keys that are stored as "1"/"0" booleans — validated separately
const BOOLEAN_KEYS = new Set(["gst_enabled", "gst_inclusive"]);

/**
 * GET /api/v1/settings/public
 * Public — returns delivery_charge, handling_charge, min_order_amount, GST config
 */
const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await StoreSetting.getPublic();
  ApiResponse.success(res, settings);
});

/**
 * GET /api/v1/settings
 * Admin — returns all settings with labels and descriptions
 */
const getAllSettings = asyncHandler(async (req, res) => {
  const settings = await StoreSetting.getAll();
  ApiResponse.success(res, settings);
});

/**
 * PUT /api/v1/settings
 * Admin — bulk update settings
 * Body: { settings: { min_order_amount: "100", delivery_charge: "0", gst_enabled: "1", ... } }
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object") {
    return ApiResponse.error(res, "Settings object is required", 400);
  }

  // Validate each key based on its type
  for (const [key, value] of Object.entries(settings)) {
    if (BOOLEAN_KEYS.has(key)) {
      if (value !== "0" && value !== "1") {
        return ApiResponse.error(
          res,
          `Invalid value for "${key}": must be "0" or "1"`,
          400,
        );
      }
    } else {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return ApiResponse.error(
          res,
          `Invalid value for "${key}": must be a non-negative number`,
          400,
        );
      }
    }
  }

  const updated = await StoreSetting.bulkSet(settings);
  const all = await StoreSetting.getAll();
  ApiResponse.success(res, all, `${updated} setting(s) updated`);
});

/**
 * GET /api/v1/settings/voice-dictionary?lang=te
 * Public — returns dynamic dictionary map for voice search
 */
const getVoiceDictionary = asyncHandler(async (req, res) => {
  const lang = String(req.query.lang || "te").toLowerCase();
  const dictionary = await StoreSetting.getVoiceDictionary(lang);
  ApiResponse.success(res, {
    lang,
    dictionary,
    count: Object.keys(dictionary).length,
  });
});

/**
 * PUT /api/v1/settings/voice-dictionary
 * Admin — updates dynamic dictionary map for a language
 * Body: { lang?: "te", dictionary: { "తెలుగు": "english" } }
 */
const updateVoiceDictionary = asyncHandler(async (req, res) => {
  const lang = String(req.body.lang || "te").toLowerCase();
  const { dictionary } = req.body;

  if (!dictionary || typeof dictionary !== "object" || Array.isArray(dictionary)) {
    return ApiResponse.error(res, "dictionary object is required", 400);
  }

  const normalized = {};
  for (const [k, v] of Object.entries(dictionary)) {
    if (typeof k !== "string" || typeof v !== "string") continue;
    const nk = k.trim().toLowerCase();
    const nv = v.trim().toLowerCase();
    if (!nk || !nv) continue;
    normalized[nk] = nv;
  }

  await StoreSetting.setVoiceDictionary(lang, normalized);
  ApiResponse.success(
    res,
    { lang, count: Object.keys(normalized).length },
    "Voice dictionary updated",
  );
});

/**
 * POST /api/v1/settings/voice-dictionary/sync
 * Admin — rebuild Telugu dictionary from product_translations table.
 */
const syncVoiceDictionaryFromDb = asyncHandler(async (_req, res) => {
  const lang = "te";
  const dictionary = await StoreSetting.buildVoiceDictionaryFromProductTranslations();
  await StoreSetting.setVoiceDictionary(lang, dictionary);

  ApiResponse.success(
    res,
    {
      lang,
      count: Object.keys(dictionary).length,
    },
    "Voice dictionary synced from product translations",
  );
});

module.exports = {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  getVoiceDictionary,
  updateVoiceDictionary,
  syncVoiceDictionaryFromDb,
};

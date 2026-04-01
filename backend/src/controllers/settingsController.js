const StoreSetting = require("../models/StoreSetting");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");

const BIRTHDAY_SETTING_KEYS = [
  "birthday_campaign_enabled",
  "birthday_discount_percent",
  "birthday_discount_code",
  "birthday_discount_valid_days",
  "birthday_offer_title",
];

// Keys that are stored as "1"/"0" booleans — validated separately
const BOOLEAN_KEYS = new Set(["gst_enabled", "gst_inclusive", "birthday_campaign_enabled"]);
const TEXT_KEYS = new Set(["birthday_discount_code", "birthday_offer_title"]);

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
    } else if (TEXT_KEYS.has(key)) {
      const textValue = String(value || "").trim();
      if (!textValue) {
        return ApiResponse.error(
          res,
          `Invalid value for "${key}": must be a non-empty string`,
          400,
        );
      }
      if (textValue.length > 120) {
        return ApiResponse.error(
          res,
          `Invalid value for "${key}": must be at most 120 characters`,
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

/**
 * GET /api/v1/settings/birthday-campaign
 * Admin — returns birthday campaign settings in typed shape
 */
const getBirthdayCampaignSettings = asyncHandler(async (_req, res) => {
  const rows = await Promise.all(BIRTHDAY_SETTING_KEYS.map((key) => StoreSetting.get(key)));
  const byKey = Object.fromEntries(rows.filter(Boolean).map((row) => [row.key, row.value]));

  ApiResponse.success(res, {
    enabled: byKey.birthday_campaign_enabled !== "0",
    discount_percent: Number(byKey.birthday_discount_percent || 10),
    discount_code: String(byKey.birthday_discount_code || "BIRTHDAY10"),
    discount_valid_days: Number(byKey.birthday_discount_valid_days || 7),
    offer_title: String(byKey.birthday_offer_title || "Birthday Special Offer"),
  });
});

/**
 * PUT /api/v1/settings/birthday-campaign
 * Admin — updates birthday campaign settings only
 */
const updateBirthdayCampaignSettings = asyncHandler(async (req, res) => {
  const {
    enabled,
    discount_percent,
    discount_code,
    discount_valid_days,
    offer_title,
  } = req.body || {};

  const updates = {};

  if (enabled !== undefined) {
    updates.birthday_campaign_enabled = enabled ? "1" : "0";
  }

  if (discount_percent !== undefined) {
    const value = Number(discount_percent);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      return ApiResponse.error(res, "discount_percent must be a number between 0 and 100", 400);
    }
    updates.birthday_discount_percent = String(value);
  }

  if (discount_valid_days !== undefined) {
    const value = Number(discount_valid_days);
    if (!Number.isInteger(value) || value < 1 || value > 60) {
      return ApiResponse.error(res, "discount_valid_days must be an integer between 1 and 60", 400);
    }
    updates.birthday_discount_valid_days = String(value);
  }

  if (discount_code !== undefined) {
    const code = String(discount_code || "").trim();
    if (!code || code.length > 40) {
      return ApiResponse.error(res, "discount_code must be a non-empty string up to 40 characters", 400);
    }
    updates.birthday_discount_code = code;
  }

  if (offer_title !== undefined) {
    const title = String(offer_title || "").trim();
    if (!title || title.length > 120) {
      return ApiResponse.error(res, "offer_title must be a non-empty string up to 120 characters", 400);
    }
    updates.birthday_offer_title = title;
  }

  if (!Object.keys(updates).length) {
    return ApiResponse.error(res, "At least one birthday campaign field is required", 400);
  }

  await StoreSetting.bulkSet(updates);

  const rows = await Promise.all(BIRTHDAY_SETTING_KEYS.map((key) => StoreSetting.get(key)));
  const byKey = Object.fromEntries(rows.filter(Boolean).map((row) => [row.key, row.value]));

  ApiResponse.success(res, {
    enabled: byKey.birthday_campaign_enabled !== "0",
    discount_percent: Number(byKey.birthday_discount_percent || 10),
    discount_code: String(byKey.birthday_discount_code || "BIRTHDAY10"),
    discount_valid_days: Number(byKey.birthday_discount_valid_days || 7),
    offer_title: String(byKey.birthday_offer_title || "Birthday Special Offer"),
  }, "Birthday campaign settings updated");
});

module.exports = {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  getBirthdayCampaignSettings,
  updateBirthdayCampaignSettings,
  getVoiceDictionary,
  updateVoiceDictionary,
  syncVoiceDictionaryFromDb,
};

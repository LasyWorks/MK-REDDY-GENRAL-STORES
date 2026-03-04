const StoreSetting = require("../models/StoreSetting");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");

/**
 * GET /api/v1/settings/public
 * Public — returns delivery_charge, handling_charge, min_order_amount
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
 * Body: { settings: { min_order_amount: "100", delivery_charge: "0", ... } }
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object") {
    return ApiResponse.error(res, "Settings object is required", 400);
  }

  // Validate that values are non-negative numbers
  for (const [key, value] of Object.entries(settings)) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return ApiResponse.error(
        res,
        `Invalid value for "${key}": must be a non-negative number`,
        400
      );
    }
  }

  const updated = await StoreSetting.bulkSet(settings);
  const all = await StoreSetting.getAll();
  ApiResponse.success(res, all, `${updated} setting(s) updated`);
});

module.exports = {
  getPublicSettings,
  getAllSettings,
  updateSettings,
};

const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");
const birthdayOfferService = require("../services/birthdayOfferService");

const getBirthDayTemplates = asyncHandler(async (_req, res) => {
  const offers = await birthdayOfferService.getOfferTemplates();
  ApiResponse.success(res, offers);
});

const getBirthDayUpcomingUsers = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = Number(req.query.year || now.getUTCFullYear());
  const month = Number(req.query.month || now.getUTCMonth() + 1);

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return ApiResponse.error(res, "Invalid year", 400);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return ApiResponse.error(res, "Invalid month", 400);
  }

  const rows = await birthdayOfferService.listUpcomingForAdmin({ year, month });
  ApiResponse.success(res, {
    year,
    month,
    users: rows,
  });
});

const assignBirthDayOffer = asyncHandler(async (req, res) => {
  const { user_id, campaign_year, offer_template_id } = req.body || {};

  if (!user_id || !campaign_year || !offer_template_id) {
    return ApiResponse.error(res, "user_id, campaign_year and offer_template_id are required", 400);
  }

  const updated = await birthdayOfferService.assignOfferToUser({
    userId: user_id,
    campaignYear: Number(campaign_year),
    offerTemplateId: offer_template_id,
    adminId: req.user.id,
  });

  if (!updated) {
    return ApiResponse.error(res, "Unable to assign birthday offer", 400);
  }

  ApiResponse.success(res, updated, "Birthday offer assigned to user");
});

const getMyBirthDayOffer = asyncHandler(async (req, res) => {
  const offer = await birthdayOfferService.getMyBirthdayOffer(req.user.id);
  ApiResponse.success(res, offer || null);
});

const bulkAssignBirthdayOffer = asyncHandler(async (req, res) => {
  const { year, month, offer_template_id } = req.body || {};

  if (!year || !month || !offer_template_id) {
    return ApiResponse.error(res, "year, month and offer_template_id are required", 400);
  }

  const result = await birthdayOfferService.bulkAssignOfferToUsers({
    year: Number(year),
    month: Number(month),
    offerTemplateId: offer_template_id,
    adminId: req.user.id,
  });

  ApiResponse.success(res, result, "Bulk birthday offer assignment completed");
});

module.exports = {
  getBirthDayTemplates,
  getBirthDayUpcomingUsers,
  assignBirthDayOffer,
  bulkAssignBirthdayOffer,
  getMyBirthDayOffer,
};

const PromotionService = require('../services/promotionService');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const getActivePromotions = asyncHandler(async (req, res) => {
  const promotions = await PromotionService.getActive();
  ApiResponse.success(res, promotions);
});
const getUpcomingPromotions = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const promotions = await PromotionService.getUpcoming(days);
  ApiResponse.success(res, promotions);
});
const getActiveProductMap = asyncHandler(async (req, res) => {
  const map = await PromotionService.getActiveProductMap();
  ApiResponse.success(res, map);
});
const getAllPromotions = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { type, is_active, status, sort_by, sort_order } = req.query;
  const result = await PromotionService.getAll({
    page,
    limit,
    type: type || null,
    isActive: is_active !== undefined ? is_active === 'true' : null,
    status: status || null,
    sortBy: sort_by || 'starts_at',
    sortOrder: sort_order || 'DESC',
  });
  ApiResponse.paginated(res, result.promotions, {
    page,
    limit,
    totalItems: result.total,
  });
});
const getPromotion = asyncHandler(async (req, res) => {
  const promo = await PromotionService.getById(req.params.id);
  ApiResponse.success(res, promo);
});
const createPromotion = asyncHandler(async (req, res) => {
  const promo = await PromotionService.create(req.body, req.user.id);
  ApiResponse.created(res, promo, 'Promotion created successfully');
});
const updatePromotion = asyncHandler(async (req, res) => {
  const promo = await PromotionService.update(req.params.id, req.body, req.user.id);
  ApiResponse.success(res, promo, 'Promotion updated successfully');
});
const deletePromotion = asyncHandler(async (req, res) => {
  await PromotionService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, 'Promotion deleted successfully');
});
const toggleActive = asyncHandler(async (req, res) => {
  const promo = await PromotionService.toggleActive(req.params.id, req.user.id);
  ApiResponse.success(res, promo, 'Promotion status updated');
});
module.exports = {
  getActivePromotions,
  getUpcomingPromotions,
  getActiveProductMap,
  getAllPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  toggleActive,
};
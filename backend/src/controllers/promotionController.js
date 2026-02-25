const PromotionService = require('../services/promotionService');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');

/* ═══════════════════════════════════════════════════════════════════════════════
   PUBLIC
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @desc    Get currently active promotions (banners, offers)
 * @route   GET /api/v1/promotions/active
 * @access  Public
 */
const getActivePromotions = asyncHandler(async (req, res) => {
  const promotions = await PromotionService.getActive();
  ApiResponse.success(res, promotions);
});

/**
 * @desc    Get upcoming promotions (next N days)
 * @route   GET /api/v1/promotions/upcoming
 * @access  Public
 */
const getUpcomingPromotions = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const promotions = await PromotionService.getUpcoming(days);
  ApiResponse.success(res, promotions);
});

/**
 * @desc    Get a map of product IDs → their active promotion badge data
 * @route   GET /api/v1/promotions/product-map
 * @access  Public
 */
const getActiveProductMap = asyncHandler(async (req, res) => {
  const map = await PromotionService.getActiveProductMap();
  ApiResponse.success(res, map);
});

/* ═══════════════════════════════════════════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @desc    List all promotions (admin, with filters)
 * @route   GET /api/v1/promotions
 * @access  Admin
 */
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

/**
 * @desc    Get promotion by ID
 * @route   GET /api/v1/promotions/:id
 * @access  Admin
 */
const getPromotion = asyncHandler(async (req, res) => {
  const promo = await PromotionService.getById(req.params.id);
  ApiResponse.success(res, promo);
});

/**
 * @desc    Create promotion
 * @route   POST /api/v1/promotions
 * @access  Admin
 */
const createPromotion = asyncHandler(async (req, res) => {
  const promo = await PromotionService.create(req.body, req.user.id);
  ApiResponse.created(res, promo, 'Promotion created successfully');
});

/**
 * @desc    Update promotion
 * @route   PUT /api/v1/promotions/:id
 * @access  Admin
 */
const updatePromotion = asyncHandler(async (req, res) => {
  const promo = await PromotionService.update(req.params.id, req.body, req.user.id);
  ApiResponse.success(res, promo, 'Promotion updated successfully');
});

/**
 * @desc    Delete promotion
 * @route   DELETE /api/v1/promotions/:id
 * @access  Admin
 */
const deletePromotion = asyncHandler(async (req, res) => {
  await PromotionService.delete(req.params.id, req.user.id);
  ApiResponse.success(res, null, 'Promotion deleted successfully');
});

/**
 * @desc    Toggle promotion active status
 * @route   PUT /api/v1/promotions/:id/toggle-active
 * @access  Admin
 */
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

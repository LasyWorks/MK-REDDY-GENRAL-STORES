const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { authenticate, authorize } = require('../middlewares/auth');

/* ── Public routes ────────────────────────────────────────────────────────── */

/**
 * @route   GET /api/v1/promotions/active
 * @desc    Get currently active promotions (banners, badges)
 * @access  Public
 */
router.get('/active', promotionController.getActivePromotions);

/**
 * @route   GET /api/v1/promotions/upcoming
 * @desc    Get promotions starting within N days
 * @access  Public
 */
router.get('/upcoming', promotionController.getUpcomingPromotions);

/**
 * @route   GET /api/v1/promotions/product-map
 * @desc    Product ID → active promo badge map
 * @access  Public
 */
router.get('/product-map', promotionController.getActiveProductMap);

/* ── Admin routes ─────────────────────────────────────────────────────────── */
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/promotions
 * @desc    List all promotions (admin, with filters)
 * @access  Admin
 */
router.get('/', promotionController.getAllPromotions);

/**
 * @route   GET /api/v1/promotions/:id
 * @desc    Get promotion by ID
 * @access  Admin
 */
router.get('/:id', promotionController.getPromotion);

/**
 * @route   POST /api/v1/promotions
 * @desc    Create promotion
 * @access  Admin
 */
router.post('/', promotionController.createPromotion);

/**
 * @route   PUT /api/v1/promotions/:id
 * @desc    Update promotion
 * @access  Admin
 */
router.put('/:id', promotionController.updatePromotion);

/**
 * @route   DELETE /api/v1/promotions/:id
 * @desc    Delete promotion
 * @access  Admin
 */
router.delete('/:id', promotionController.deletePromotion);

/**
 * @route   PUT /api/v1/promotions/:id/toggle-active
 * @desc    Toggle promotion active/inactive
 * @access  Admin
 */
router.put('/:id/toggle-active', promotionController.toggleActive);

module.exports = router;

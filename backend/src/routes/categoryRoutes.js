const express = require('express');
const router = express.Router();
const { categoryController } = require('../controllers');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth');
const { validateCreateCategory, validateUpdateCategory } = require('../utils/validators');

/**
 * @route   GET /api/v1/categories
 * @desc    Get all active categories
 * @access  Public
 */
router.get('/', optionalAuth, categoryController.getAllCategories);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, categoryController.getCategoryById);

/**
 * @route   GET /api/v1/categories/:id/products
 * @desc    Get products by category
 * @access  Public
 */
router.get('/:id/products', optionalAuth, categoryController.getCategoryProducts);

// Admin routes
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/categories/admin/all
 * @desc    Get all categories (including inactive)
 * @access  Admin
 */
router.get('/admin/all', categoryController.getAllCategoriesAdmin);

/**
 * @route   POST /api/v1/categories
 * @desc    Create new category
 * @access  Admin
 */
router.post('/', validateCreateCategory, categoryController.createCategory);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category
 * @access  Admin
 */
router.put('/:id', validateUpdateCategory, categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Admin
 */
router.delete('/:id', categoryController.deleteCategory);

/**
 * @route   PUT /api/v1/categories/:id/toggle-active
 * @desc    Toggle category active status
 * @access  Admin
 */
router.put('/:id/toggle-active', categoryController.toggleActive);

module.exports = router;

const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth');
const { uploadExcel } = require('../middlewares/upload');
const { validateCreateProduct, validateUpdateProduct, validateStockUpdate } = require('../utils/validators');

/**
 * @route   GET /api/v1/products
 * @desc    Get all active products with pagination and filters
 * @access  Public
 */
router.get('/', optionalAuth, productController.getAllProducts);

/**
 * @route   GET /api/v1/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', optionalAuth, productController.searchProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, productController.getProductById);

// Admin routes
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/products/admin/all
 * @desc    Get all products (including inactive)
 * @access  Admin
 */
router.get('/admin/all', productController.getAllProductsAdmin);

/**
 * @route   GET /api/v1/products/admin/low-stock
 * @desc    Get low stock products
 * @access  Admin
 */
router.get('/admin/low-stock', productController.getLowStockProducts);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Admin
 */
router.post('/', validateCreateProduct, productController.createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/:id', validateUpdateProduct, productController.updateProduct);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete)
 * @access  Admin
 */
router.delete('/:id', productController.deleteProduct);

/**
 * @route   PUT /api/v1/products/:id/stock
 * @desc    Update product stock
 * @access  Admin
 */
router.put('/:id/stock', validateStockUpdate, productController.updateStock);

/**
 * @route   PUT /api/v1/products/:id/toggle-active
 * @desc    Toggle product active status
 * @access  Admin
 */
router.put('/:id/toggle-active', productController.toggleActive);

/**
 * @route   POST /api/v1/products/bulk-upload
 * @desc    Bulk upload products via Excel
 * @access  Admin
 */
router.post('/bulk-upload', uploadExcel, productController.bulkUpload);

/**
 * @route   GET /api/v1/products/template/download
 * @desc    Download bulk upload template
 * @access  Admin
 */
router.get('/template/download', productController.downloadTemplate);

module.exports = router;

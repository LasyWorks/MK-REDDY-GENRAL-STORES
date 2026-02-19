const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateSystemConfig, validateGSTConfig } = require('../utils/validators');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @route   GET /api/v1/admin/health
 * @desc    Get system health status
 * @access  Admin
 */
router.get('/health', adminController.getSystemHealth);

/**
 * @route   GET /api/v1/admin/reports/sales
 * @desc    Get sales report
 * @access  Admin
 */
router.get('/reports/sales', adminController.getSalesReport);

/**
 * @route   GET /api/v1/admin/reports/inventory
 * @desc    Get inventory report
 * @access  Admin
 */
router.get('/reports/inventory', adminController.getInventoryReport);

/**
 * @route   GET /api/v1/admin/reports/customers
 * @desc    Get customer report
 * @access  Admin
 */
router.get('/reports/customers', adminController.getCustomerReport);

/**
 * @route   GET /api/v1/admin/reports/top-products
 * @desc    Get top selling products
 * @access  Admin
 */
router.get('/reports/top-products', adminController.getTopProducts);

/**
 * @route   GET /api/v1/admin/reports/low-stock
 * @desc    Get low stock products
 * @access  Admin
 */
router.get('/reports/low-stock', adminController.getLowStockProducts);

/**
 * @route   GET /api/v1/admin/logs
 * @desc    Get admin activity logs
 * @access  Admin
 */
router.get('/logs', adminController.getAdminLogs);

/**
 * @route   GET /api/v1/admin/config
 * @desc    Get system configuration
 * @access  Admin
 */
router.get('/config', adminController.getSystemConfig);

/**
 * @route   PUT /api/v1/admin/config
 * @desc    Update system configuration
 * @access  Admin
 */
router.put('/config', validateSystemConfig, adminController.updateSystemConfig);

/**
 * @route   GET /api/v1/admin/gst-config
 * @desc    Get GST configuration
 * @access  Admin
 */
router.get('/gst-config', adminController.getGSTConfig);

/**
 * @route   PUT /api/v1/admin/gst-config/:id
 * @desc    Update GST configuration
 * @access  Admin
 */
router.put('/gst-config/:id', validateGSTConfig, adminController.updateGSTConfig);

/**
 * @route   GET /api/v1/admin/stats/business
 * @desc    Get business statistics
 * @access  Admin
 */
router.get('/stats/business', adminController.getBusinessStats);

/**
 * @route   GET /api/v1/admin/stats/pending-orders
 * @desc    Get pending orders count
 * @access  Admin
 */
router.get('/stats/pending-orders', adminController.getPendingOrdersCount);

/**
 * @route   GET /api/v1/admin/activity/recent
 * @desc    Get recent activity
 * @access  Admin
 */
router.get('/activity/recent', adminController.getRecentActivity);

/**
 * @route   GET /api/v1/admin/export/:type
 * @desc    Export data (orders, products, customers, invoices, inventory)
 * @access  Admin
 */
router.get('/export/:type', adminController.exportData);

module.exports = router;

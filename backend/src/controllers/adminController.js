const { AdminService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Admin
 */
const getDashboard = asyncHandler(async (req, res) => {
  const stats = await AdminService.getDashboardStats();
  ApiResponse.success(res, stats);
});

/**
 * @desc    Get sales report
 * @route   GET /api/v1/admin/reports/sales
 * @access  Admin
 */
const getSalesReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, group_by } = req.query;
  const report = await AdminService.getSalesReport(start_date, end_date, group_by || 'day');
  ApiResponse.success(res, report);
});

/**
 * @desc    Get inventory report
 * @route   GET /api/v1/admin/reports/inventory
 * @access  Admin
 */
const getInventoryReport = asyncHandler(async (req, res) => {
  const report = await AdminService.getInventoryReport();
  ApiResponse.success(res, report);
});

/**
 * @desc    Get customer report
 * @route   GET /api/v1/admin/reports/customers
 * @access  Admin
 */
const getCustomerReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, customer_type } = req.query;
  const report = await AdminService.getCustomerReport(start_date, end_date, customer_type);
  ApiResponse.success(res, report);
});

/**
 * @desc    Get top selling products
 * @route   GET /api/v1/admin/reports/top-products
 * @access  Admin
 */
const getTopProducts = asyncHandler(async (req, res) => {
  const { limit, start_date, end_date } = req.query;
  const report = await AdminService.getTopSellingProducts(
    parseInt(limit) || 10,
    start_date,
    end_date
  );
  ApiResponse.success(res, report);
});

/**
 * @desc    Get low stock products
 * @route   GET /api/v1/admin/reports/low-stock
 * @access  Admin
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold } = req.query;
  const report = await AdminService.getLowStockProducts(parseInt(threshold) || 10);
  ApiResponse.success(res, report);
});

/**
 * @desc    Get admin activity logs
 * @route   GET /api/v1/admin/logs
 * @access  Admin
 */
const getAdminLogs = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { action, admin_id, start_date, end_date } = req.query;

  const result = await AdminService.getActivityLogs({
    page,
    limit,
    action,
    adminId: admin_id,
    startDate: start_date,
    endDate: end_date,
  });

  ApiResponse.paginated(res, result.logs, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Get system configuration
 * @route   GET /api/v1/admin/config
 * @access  Admin
 */
const getSystemConfig = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const config = await AdminService.getSystemConfig(category);
  ApiResponse.success(res, config);
});

/**
 * @desc    Update system configuration
 * @route   PUT /api/v1/admin/config
 * @access  Admin
 */
const updateSystemConfig = asyncHandler(async (req, res) => {
  const { key, value, description, category } = req.body;

  const config = await AdminService.updateSystemConfig(
    key,
    value,
    req.user.id,
    description,
    category
  );

  ApiResponse.success(res, config, 'Configuration updated');
});

/**
 * @desc    Get GST configuration
 * @route   GET /api/v1/admin/gst-config
 * @access  Admin
 */
const getGSTConfig = asyncHandler(async (req, res) => {
  const config = await AdminService.getGSTConfig();
  ApiResponse.success(res, config);
});

/**
 * @desc    Update GST configuration
 * @route   PUT /api/v1/admin/gst-config/:id
 * @access  Admin
 */
const updateGSTConfig = asyncHandler(async (req, res) => {
  const { category_name, hsn_code, cgst_rate, sgst_rate, igst_rate, is_active } = req.body;

  const config = await AdminService.updateGSTConfig(req.params.id, {
    category_name,
    hsn_code,
    cgst_rate,
    sgst_rate,
    igst_rate,
    is_active,
  });

  await AdminService.logActivity(
    req.user.id,
    'UPDATE_GST_CONFIG',
    'gst_config',
    req.params.id,
    { category_name, cgst_rate, sgst_rate }
  );

  ApiResponse.success(res, config, 'GST configuration updated');
});

/**
 * @desc    Get business statistics
 * @route   GET /api/v1/admin/stats/business
 * @access  Admin
 */
const getBusinessStats = asyncHandler(async (req, res) => {
  const { period } = req.query; // today, week, month, year
  const stats = await AdminService.getBusinessStats(period || 'month');
  ApiResponse.success(res, stats);
});

/**
 * @desc    Export data
 * @route   GET /api/v1/admin/export/:type
 * @access  Admin
 */
const exportData = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { start_date, end_date, format } = req.query;

  const validTypes = ['orders', 'products', 'customers', 'invoices', 'inventory'];
  if (!validTypes.includes(type)) {
    return ApiResponse.error(res, `Invalid export type. Valid types: ${validTypes.join(', ')}`, 400);
  }

  const data = await AdminService.exportData(type, {
    startDate: start_date,
    endDate: end_date,
    format: format || 'json',
  });

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
    return res.send(data);
  }

  ApiResponse.success(res, data);
});

/**
 * @desc    Get pending orders count
 * @route   GET /api/v1/admin/stats/pending-orders
 * @access  Admin
 */
const getPendingOrdersCount = asyncHandler(async (req, res) => {
  const stats = await AdminService.getPendingOrdersStats();
  ApiResponse.success(res, stats);
});

/**
 * @desc    Get recent activity
 * @route   GET /api/v1/admin/activity/recent
 * @access  Admin
 */
const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const activity = await AdminService.getRecentActivity(parseInt(limit) || 20);
  ApiResponse.success(res, activity);
});

/**
 * @desc    Get system health status
 * @route   GET /api/v1/admin/health
 * @access  Admin
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  const health = await AdminService.getSystemHealth();
  ApiResponse.success(res, health);
});

module.exports = {
  getDashboard,
  getSalesReport,
  getInventoryReport,
  getCustomerReport,
  getTopProducts,
  getLowStockProducts,
  getAdminLogs,
  getSystemConfig,
  updateSystemConfig,
  getGSTConfig,
  updateGSTConfig,
  getBusinessStats,
  exportData,
  getPendingOrdersCount,
  getRecentActivity,
  getSystemHealth,
};

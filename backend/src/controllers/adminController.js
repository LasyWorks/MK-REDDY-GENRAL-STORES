const { AdminService } = require('../services');
const AdminLog = require('../models/AdminLog');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');
const getDashboard = asyncHandler(async (req, res) => {
  const stats = await AdminService.getDashboardStats();
  ApiResponse.success(res, stats);
});
const getSalesReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, group_by } = req.query;
  const report = await AdminService.getSalesReport(start_date, end_date, group_by || 'day');
  ApiResponse.success(res, report);
});
const getInventoryReport = asyncHandler(async (req, res) => {
  const report = await AdminService.getInventoryReport();
  ApiResponse.success(res, report);
});
const getCustomerReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, limit } = req.query;
  const report = await AdminService.getCustomerReport(start_date, end_date, parseInt(limit) || 20);
  ApiResponse.success(res, report);
});
const getTopProducts = asyncHandler(async (req, res) => {
  const { limit, start_date, end_date } = req.query;
  const report = await AdminService.getTopSellingProducts(
    parseInt(limit) || 10,
    start_date,
    end_date
  );
  ApiResponse.success(res, report);
});
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold } = req.query;
  const report = await AdminService.getLowStockProducts(parseInt(threshold) || 10);
  ApiResponse.success(res, report);
});
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
const getSystemConfig = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const config = await AdminService.getSystemConfig(category);
  ApiResponse.success(res, config);
});
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
const getGSTConfig = asyncHandler(async (req, res) => {
  const config = await AdminService.getGSTConfig();
  ApiResponse.success(res, config);
});
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
  await AdminLog.create({
    adminId: req.user.id,
    action: 'UPDATE_GST_CONFIG',
    entityType: 'gst_config',
    entityId: req.params.id,
    newValue: { category_name, cgst_rate, sgst_rate },
  });
  ApiResponse.success(res, config, 'GST configuration updated');
});
const getBusinessStats = asyncHandler(async (req, res) => {
  const { period } = req.query; 
  const stats = await AdminService.getBusinessStats(period || 'month');
  ApiResponse.success(res, stats);
});
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
const getPendingOrdersCount = asyncHandler(async (req, res) => {
  const stats = await AdminService.getPendingOrdersStats();
  ApiResponse.success(res, stats);
});
const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const activity = await AdminService.getRecentActivity(parseInt(limit) || 20);
  ApiResponse.success(res, activity);
});
const getSystemHealth = asyncHandler(async (req, res) => {
  const health = await AdminService.getSystemHealth();
  ApiResponse.success(res, health);
});

const getFrequentlyBoughtProducts = asyncHandler(async (req, res) => {
  const { limit, start_date, end_date } = req.query;
  const report = await AdminService.getMostFrequentlyBoughtProducts(
    parseInt(limit) || 10,
    start_date,
    end_date
  );
  ApiResponse.success(res, report);
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
  getFrequentlyBoughtProducts,
};

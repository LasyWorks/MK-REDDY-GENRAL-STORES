const { AdminNotification, User } = require('../models');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const emailService = require('../services/emailService');
const { modify } = require('../config/database');
const { getActiveStockIssues } = require('../services/stockIssueService');

const getNotifications = asyncHandler(async (req, res) => {
  await AdminNotification.resolveCompletedIssues().catch(() => {});

  const [notifications, unreadCount] = await Promise.all([
    AdminNotification.getForAdmin({ limit: 100 }),
    AdminNotification.countUnread(),
  ]);
  ApiResponse.success(res, { notifications, unreadCount }, 'OK');
});

const markRead = asyncHandler(async (req, res) => {
  await AdminNotification.markRead(req.params.id);
  ApiResponse.success(res, null, 'Marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await AdminNotification.markAllRead();
  ApiResponse.success(res, null, 'All marked as read');
});

/**
 * POST /api/v1/notifications/scan-stock-alerts
 * Runs an immediate catalog scan and triggers missing low/out-of-stock alerts.
 */
const scanStockAlerts = asyncHandler(async (req, res) => {
  const stockAlertService = require('../services/stockAlertService');
  const result = await stockAlertService.runFullScan();
  ApiResponse.success(res, result, 'Stock alert scan completed');
});

/**
 * GET /api/v1/notifications/test-email
 * Sends a test stock-alert email immediately to all admin emails.
 * Also returns what email addresses were found in the DB.
 */
const testEmail = asyncHandler(async (req, res) => {
  const adminEmails = await User.findAdminEmails();
  if (!adminEmails.length) {
    return ApiResponse.success(res, { adminEmails: [], sent: 0, error: 'No admin emails found in DB' }, 'No admin emails');
  }

  const fakeProduct = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'TEST PRODUCT (Email Test)',
    sku: 'TEST-SKU',
    variant: null,
    unit_pack_size: null,
    stock_quantity: 0,
    low_stock_threshold: 10,
  };

  const result = await emailService.sendStockAlert(adminEmails, fakeProduct, 'out');
  ApiResponse.success(res, { adminEmails, result }, `Test email attempted to ${adminEmails.length} admin(s)`);
});

/**
 * PATCH /api/v1/notifications/force-resend
 * Resets email_sent_at on all unresolved notifications so the next
 * restart (or manual trigger) will resend regardless of the 1-day window.
 */
const forceResend = asyncHandler(async (req, res) => {
  await modify(`UPDATE admin_notifications SET email_sent_at = NULL WHERE resolved_at IS NULL`);
  
  // Now immediately re-check all low/out-of-stock products
  const stockAlertService = require('../services/stockAlertService');
  const rows = await getActiveStockIssues();

  const results = [];
  for (const row of rows) {
    const product = {
      id: row.id, name: row.name, sku: row.sku,
      variant: row.variant, unit_pack_size: row.unit_pack_size,
      stock_quantity: parseFloat(row.stock_quantity ?? 0),
      low_stock_threshold: parseFloat(row.low_stock_threshold ?? 10),
    };
    await stockAlertService.checkAndAlert(product);
    results.push({ name: row.name, stock: row.stock_quantity });
  }

  ApiResponse.success(res, { triggered: results.length, products: results }, 'Force resend complete');
});

/**
 * PATCH /api/v1/notifications/cleanup-done
 * Manually resolves completed issue notifications and removes resolved issue rows.
 */
const cleanupDone = asyncHandler(async (req, res) => {
  const resolved = await AdminNotification.resolveCompletedIssues();
  const removed = await AdminNotification.deleteResolvedIssues();

  ApiResponse.success(
    res,
    { resolved, removed },
    `Cleanup completed. Removed ${removed} completed notifications.`
  );
});

/**
 * DELETE /api/v1/notifications/all
 * Remove all bell notifications.
 */
const clearAll = asyncHandler(async (req, res) => {
  const removed = await AdminNotification.deleteAll();
  ApiResponse.success(res, { removed }, `Cleared ${removed} notifications.`);
});

module.exports = { getNotifications, markRead, markAllRead, testEmail, forceResend, scanStockAlerts, cleanupDone, clearAll };

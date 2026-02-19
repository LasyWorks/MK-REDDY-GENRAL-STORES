const { Order, Invoice, User, Product, Category, AdminLog, SystemConfig } = require('../models');
const { query } = require('../config/database');

class AdminService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats() {
    // Get today's date range
    const today = new Date().toISOString().split('T')[0];
    
    // Get customer count
    const customerCount = await User.countCustomers();
    
    // Get product count
    const productCount = await Product.count();

    // Get order statistics
    const orderStats = await Order.getStatistics();

    // Today's orders
    const todayOrders = await Order.getStatistics(today, today);

    // Get recent activity
    const recentActivity = await AdminLog.getRecentActivity(10);

    // Get pending orders
    const pendingOrders = await query(
      `SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed')`
    );

    return {
      customers: {
        total: customerCount,
        limit: 50,
      },
      products: {
        total: productCount,
        limit: 500,
      },
      orders: {
        total: orderStats.total_orders || 0,
        completed: orderStats.completed_orders || 0,
        cancelled: orderStats.cancelled_orders || 0,
        pending: pendingOrders[0].count || 0,
      },
      revenue: {
        total: parseFloat(orderStats.total_revenue || 0),
        totalSales: parseFloat(orderStats.total_sales || 0),
        totalGst: parseFloat(orderStats.total_gst || 0),
      },
      today: {
        orders: todayOrders.total_orders || 0,
        revenue: parseFloat(todayOrders.total_revenue || 0),
      },
      recentActivity,
    };
  }

  /**
   * Get sales report
   */
  static async getSalesReport(startDate, endDate, groupBy = 'day') {
    let dateFormat;
    let groupLabel;

    switch (groupBy) {
      case 'month':
        dateFormat = '%Y-%m';
        groupLabel = 'month';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        groupLabel = 'week';
        break;
      default:
        dateFormat = '%Y-%m-%d';
        groupLabel = 'day';
    }

    const salesData = await query(
      `SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as order_count,
        SUM(CASE WHEN status = 'picked_up' THEN subtotal ELSE 0 END) as sales,
        SUM(CASE WHEN status = 'picked_up' THEN total_gst ELSE 0 END) as gst,
        SUM(CASE WHEN status = 'picked_up' THEN total_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM orders
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY period
       ORDER BY period`,
      [dateFormat, startDate, endDate]
    );

    // Get totals
    const totals = await Order.getStatistics(startDate, endDate);

    return {
      period: { startDate, endDate },
      groupBy: groupLabel,
      summary: {
        totalOrders: totals.total_orders || 0,
        completedOrders: totals.completed_orders || 0,
        cancelledOrders: totals.cancelled_orders || 0,
        totalSales: parseFloat(totals.total_sales || 0),
        totalGst: parseFloat(totals.total_gst || 0),
        totalRevenue: parseFloat(totals.total_revenue || 0),
      },
      data: salesData.map(row => ({
        period: row.period,
        orderCount: row.order_count,
        sales: parseFloat(row.sales || 0),
        gst: parseFloat(row.gst || 0),
        revenue: parseFloat(row.revenue || 0),
        cancelled: row.cancelled,
      })),
    };
  }

  /**
   * Get GST report
   */
  static async getGSTReport(startDate, endDate) {
    return Invoice.getGSTReport(startDate, endDate);
  }

  /**
   * Get product performance report
   */
  static async getProductReport(startDate, endDate, limit = 20) {
    const safeLimit = parseInt(limit) || 20;
    const topProducts = await query(
      `SELECT 
        p.id,
        p.name_en,
        p.sku,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_sales,
        COUNT(DISTINCT oi.order_id) as order_count
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'picked_up' AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY p.id
       ORDER BY total_sales DESC
       LIMIT ${safeLimit}`,
      [startDate, endDate]
    );

    const categoryWise = await query(
      `SELECT 
        c.id as category_id,
        c.name_en as category_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_sales,
        COUNT(DISTINCT oi.order_id) as order_count
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'picked_up' AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY c.id
       ORDER BY total_sales DESC`,
      [startDate, endDate]
    );

    return {
      period: { startDate, endDate },
      topProducts: topProducts.map(p => ({
        id: p.id,
        name: p.name_en,
        sku: p.sku,
        quantitySold: p.total_quantity,
        totalSales: parseFloat(p.total_sales || 0),
        orderCount: p.order_count,
      })),
      categoryWise: categoryWise.map(c => ({
        categoryId: c.category_id,
        categoryName: c.category_name,
        quantitySold: c.total_quantity,
        totalSales: parseFloat(c.total_sales || 0),
        orderCount: c.order_count,
      })),
    };
  }

  /**
   * Get customer report
   */
  static async getCustomerReport(startDate, endDate, limit = 20) {
    const safeCustLimit = parseInt(limit) || 20;
    const topCustomers = await query(
      `SELECT 
        u.id,
        u.name,
        u.phone,
        u.user_type,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent
       FROM users u
       JOIN orders o ON u.id = o.user_id
       WHERE o.status = 'picked_up' AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY u.id
       ORDER BY total_spent DESC
       LIMIT ${safeCustLimit}`,
      [startDate, endDate]
    );

    const userTypeBreakdown = await query(
      `SELECT 
        u.user_type,
        COUNT(DISTINCT u.id) as customer_count,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_revenue
       FROM users u
       JOIN orders o ON u.id = o.user_id
       WHERE o.status = 'picked_up' AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY u.user_type`,
      [startDate, endDate]
    );

    return {
      period: { startDate, endDate },
      topCustomers: topCustomers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        userType: c.user_type,
        orderCount: c.order_count,
        totalSpent: parseFloat(c.total_spent || 0),
      })),
      userTypeBreakdown: userTypeBreakdown.map(b => ({
        userType: b.user_type,
        customerCount: b.customer_count,
        orderCount: b.order_count,
        totalRevenue: parseFloat(b.total_revenue || 0),
      })),
    };
  }

  /**
   * Get admin activity logs
   */
  static async getActivityLogs(options = {}) {
    return AdminLog.findAll(options);
  }

  /**
   * Get system configuration
   */
  static async getSystemConfig() {
    return SystemConfig.getAll();
  }

  /**
   * Update system configuration
   */
  static async updateSystemConfig(configs, adminId) {
    await SystemConfig.bulkUpdate(configs);

    await AdminLog.create({
      adminId,
      action: 'UPDATE_SYSTEM_CONFIG',
      entityType: 'system_config',
      newValue: configs,
    });

    return SystemConfig.getAll();
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(threshold = 10) {
    const products = await query(
      `SELECT p.*, c.name_en as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.stock_quantity <= ? AND p.is_active = TRUE
       ORDER BY p.stock_quantity ASC`,
      [threshold]
    );

    return products.map(p => ({
      id: p.id,
      name: p.name_en,
      sku: p.sku,
      category: p.category_name,
      stockQuantity: p.stock_quantity,
      price: parseFloat(p.price),
    }));
  }
}

module.exports = AdminService;

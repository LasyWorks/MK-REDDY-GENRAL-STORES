const {
  Order,
  Invoice,
  User,
  Product,
  Category,
  AdminLog,
  SystemConfig,
} = require("../models");
const { query, queryOne, modify: dbModify } = require("../config/database");
const PROD_TRANS_JOIN = `
  LEFT JOIN product_translations  pt_en ON p.id = pt_en.product_id  AND pt_en.lang_code = 'en'
  LEFT JOIN category_translations ct_en ON c.id = ct_en.category_id AND ct_en.lang_code = 'en'
`;
class AdminService {
  static async getDashboardStats() {
    const today = new Date().toISOString().split("T")[0];
    const customerCount = await User.countCustomers();
    const orderStats = await Order.getStatistics();
    const todayOrders = await Order.getStatistics(today, today);
    let recentActivity = [];
    try {
      recentActivity = await AdminLog.getRecentActivity(10);
    } catch (logErr) {
      // Non-critical — don't let an admin_logs timeout break the dashboard
      console.warn(
        "AdminLog.getRecentActivity failed (non-fatal):",
        logErr.message,
      );
    }
    const [productCountResult, pendingOrders, lowStockResult, outOfStockResult] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM products`),
      query(`SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed')`),
      query(`SELECT COUNT(*) as count FROM products WHERE stock_quantity > 0 AND stock_quantity <= COALESCE(low_stock_threshold, 10)`),
      query(`SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 0`),
    ]);
    const productCount = parseInt(productCountResult[0]?.count || 0);
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
      lowStock: parseInt(lowStockResult[0]?.count || 0),
      outOfStock: parseInt(outOfStockResult[0]?.count || 0),
      recentActivity,
    };
  }
  static async getSalesReport(startDate, endDate, groupBy = "day") {
    const today = new Date().toISOString().split("T")[0];
    const start = startDate || today;
    const end = endDate || today;
    let pgFormat;
    let groupLabel;
    switch (groupBy) {
      case "month":
        pgFormat = "YYYY-MM";
        groupLabel = "month";
        break;
      case "week":
        pgFormat = "IYYY-IW";
        groupLabel = "week";
        break;
      default:
        pgFormat = "YYYY-MM-DD";
        groupLabel = "day";
    }
    const salesData = await query(
      `SELECT
         TO_CHAR(created_at, $1)                                            AS period,
         COUNT(*)                                                            AS order_count,
         SUM(CASE WHEN status='picked_up'  THEN subtotal     ELSE 0 END)   AS sales,
         SUM(CASE WHEN status='picked_up'  THEN total_gst    ELSE 0 END)   AS gst,
         SUM(CASE WHEN status='picked_up'  THEN total_amount ELSE 0 END)   AS revenue,
         SUM(CASE WHEN status='cancelled'  THEN 1            ELSE 0 END)   AS cancelled
       FROM orders
       WHERE created_at >= $2::date AND created_at < ($3::date + interval '1 day')
       GROUP BY period
       ORDER BY period`,
      [pgFormat, start, end],
    );
    const totals = await Order.getStatistics(start, end);
    return {
      period: { startDate: start, endDate: end },
      groupBy: groupLabel,
      summary: {
        totalOrders: totals.total_orders || 0,
        completedOrders: totals.completed_orders || 0,
        cancelledOrders: totals.cancelled_orders || 0,
        totalSales: parseFloat(totals.total_sales || 0),
        totalGst: parseFloat(totals.total_gst || 0),
        totalRevenue: parseFloat(totals.total_revenue || 0),
      },
      data: salesData.map((row) => ({
        period: row.period,
        orderCount: parseInt(row.order_count, 10),
        sales: parseFloat(row.sales || 0),
        gst: parseFloat(row.gst || 0),
        revenue: parseFloat(row.revenue || 0),
        cancelled: parseInt(row.cancelled, 10),
      })),
    };
  }
  static async getGSTReport(startDate, endDate) {
    return Invoice.getGSTReport(startDate, endDate);
  }
  static async getProductReport(startDate, endDate, limit = 20) {
    const today = new Date().toISOString().split("T")[0];
    const start = startDate || today;
    const end = endDate || today;
    const safeLimit = parseInt(limit) || 20;
    const topProducts = await query(
      `SELECT p.id, pt_en.name AS name_en, p.sku,
              SUM(oi.quantity)          AS total_quantity,
              SUM(oi.subtotal)          AS total_sales,
              COUNT(DISTINCT oi.order_id) AS order_count
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_translations pt_en ON p.id = pt_en.product_id AND pt_en.lang_code = 'en'
       JOIN orders   o ON oi.order_id   = o.id
       WHERE o.status = 'picked_up' AND o.created_at >= $1::date AND o.created_at < ($2::date + interval '1 day')
       GROUP BY p.id, pt_en.name
       ORDER BY total_sales DESC
       LIMIT $3`,
      [start, end, safeLimit],
    );
    const categoryWise = await query(
      `SELECT c.id AS category_id, ct_en.name AS category_name,
              SUM(oi.quantity)            AS total_quantity,
              SUM(oi.subtotal)            AS total_sales,
              COUNT(DISTINCT oi.order_id) AS order_count
       FROM order_items oi
       JOIN products   p ON oi.product_id  = p.id
       JOIN categories c ON p.category_id  = c.id
       LEFT JOIN category_translations ct_en ON c.id = ct_en.category_id AND ct_en.lang_code = 'en'
       JOIN orders     o ON oi.order_id    = o.id
       WHERE o.status = 'picked_up' AND o.created_at >= $1::date AND o.created_at < ($2::date + interval '1 day')
       GROUP BY c.id, ct_en.name
       ORDER BY total_sales DESC`,
      [start, end],
    );
    return {
      period: { startDate: start, endDate: end },
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name_en,
        sku: p.sku,
        quantitySold: parseInt(p.total_quantity, 10) || 0,
        totalSales: parseFloat(p.total_sales || 0),
        orderCount: parseInt(p.order_count, 10) || 0,
      })),
      categoryWise: categoryWise.map((c) => ({
        categoryId: c.category_id,
        categoryName: c.category_name,
        quantitySold: parseInt(c.total_quantity, 10) || 0,
        totalSales: parseFloat(c.total_sales || 0),
        orderCount: parseInt(c.order_count, 10) || 0,
      })),
    };
  }
  static async getTopSellingProducts(limit, startDate, endDate) {
    return this.getProductReport(startDate, endDate, limit);
  }

  /**
   * Get most frequently bought products ordered by quantity
   */
  static async getMostFrequentlyBoughtProducts(limit = 10, startDate, endDate) {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split("T")[0];
    const start = startDate || thirtyDaysAgo;
    const end = endDate || today;
    const safeLimit = parseInt(limit) || 10;

    const products = await query(
      `SELECT 
        p.id, 
        COALESCE(pt_en.name, p.sku) AS name_en, 
        p.sku,
        p.image_url,
        p.price,
        p.mrp,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.subtotal) AS total_sales,
        COUNT(DISTINCT oi.order_id) AS order_count
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_translations pt_en ON p.id = pt_en.product_id AND pt_en.lang_code = 'en'
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'picked_up' AND o.created_at >= $1::date AND o.created_at < ($2::date + interval '1 day')
       GROUP BY p.id, pt_en.name
       ORDER BY total_quantity DESC, order_count DESC
       LIMIT $3`,
      [start, end, safeLimit],
    );

    return {
      period: { startDate: start, endDate: end },
      products: products.map((p) => ({
        id: p.id,
        name: p.name_en,
        sku: p.sku,
        imageUrl: p.image_url,
        price: parseFloat(p.price || 0),
        mrp: parseFloat(p.mrp || 0),
        quantitySold: parseInt(p.total_quantity, 10) || 0,
        totalSales: parseFloat(p.total_sales || 0),
        orderCount: parseInt(p.order_count, 10) || 0,
      })),
    };
  }
  static async getCustomerReport(startDate, endDate, limit = 20) {
    const today = new Date().toISOString().split("T")[0];
    const start = startDate || today;
    const end = endDate || today;
    const safeCustLimit = parseInt(limit) || 20;
    const topCustomers = await query(
      `SELECT u.id, u.name, u.phone, u.user_type,
              COUNT(o.id)          AS order_count,
              SUM(o.total_amount)  AS total_spent
       FROM users u
       JOIN orders o ON u.id = o.user_id
       WHERE o.status = 'picked_up' AND o.created_at >= $1::date AND o.created_at < ($2::date + interval '1 day')
       GROUP BY u.id
       ORDER BY total_spent DESC
       LIMIT $3`,
      [start, end, safeCustLimit],
    );
    const userTypeBreakdown = await query(
      `SELECT u.user_type,
              COUNT(DISTINCT u.id) AS customer_count,
              COUNT(o.id)          AS order_count,
              SUM(o.total_amount)  AS total_revenue
       FROM users u
       JOIN orders o ON u.id = o.user_id
       WHERE o.status = 'picked_up' AND o.created_at >= $1::date AND o.created_at < ($2::date + interval '1 day')
       GROUP BY u.user_type`,
      [start, end],
    );
    return {
      period: { startDate: start, endDate: end },
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        userType: c.user_type,
        orderCount: parseInt(c.order_count, 10) || 0,
        totalSpent: parseFloat(c.total_spent || 0),
      })),
      userTypeBreakdown: userTypeBreakdown.map((b) => ({
        userType: b.user_type,
        customerCount: parseInt(b.customer_count, 10) || 0,
        orderCount: parseInt(b.order_count, 10) || 0,
        totalRevenue: parseFloat(b.total_revenue || 0),
      })),
    };
  }
  static async getActivityLogs(options = {}) {
    return AdminLog.findAll(options);
  }
  static async getSystemConfig() {
    return SystemConfig.getAll();
  }
  static async updateSystemConfig(key, value, adminId, description, category) {
    await SystemConfig.set(key, value, description);
    await AdminLog.create({
      adminId,
      action: "UPDATE_SYSTEM_CONFIG",
      entityType: "system_config",
      newValue: { key, value, category, description },
    });
    return SystemConfig.getAll();
  }
  static async getLowStockProducts(threshold = 10) {
    const products = await query(
      `SELECT p.id, pt_en.name AS name, p.sku, ct_en.name AS category, p.stock_quantity, p.price, p.low_stock_threshold
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${PROD_TRANS_JOIN}
       WHERE p.stock_quantity > 0 AND p.stock_quantity <= COALESCE(p.low_stock_threshold, $1) AND p.is_active = TRUE
       ORDER BY p.stock_quantity ASC`,
      [threshold],
    );
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stock_quantity,
      price: parseFloat(p.price),
    }));
  }
  static async getInventoryReport() {
    const byCategory = await query(
      `SELECT ct_en.name AS category, COUNT(p.id) AS product_count,
              SUM(p.stock_quantity) AS total_stock,
              SUM(p.stock_quantity * p.price) AS stock_value
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${PROD_TRANS_JOIN}
       WHERE p.is_active = TRUE
       GROUP BY c.id, ct_en.name
       ORDER BY stock_value DESC`,
    );
    const lowStock = await query(
      `SELECT p.id, pt_en.name AS name, p.sku, p.stock_quantity, ct_en.name AS category
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${PROD_TRANS_JOIN}
       WHERE p.stock_quantity > 0 AND p.stock_quantity <= COALESCE(p.low_stock_threshold, 10) AND p.is_active = TRUE
       ORDER BY p.stock_quantity ASC`,
    );
    const outOfStock = await queryOne(
      `SELECT COUNT(*) AS count FROM products WHERE stock_quantity <= 0 AND is_active = TRUE`,
    );
    return {
      byCategory: byCategory.map((r) => ({
        category: r.category,
        productCount: parseInt(r.product_count, 10),
        totalStock: parseInt(r.total_stock, 10) || 0,
        stockValue: parseFloat(r.stock_value || 0),
      })),
      lowStockProducts: lowStock,
      outOfStockCount: parseInt(outOfStock.count, 10),
    };
  }
  static async getGSTConfig() {
    const rows = await query(
      `SELECT p.id, pt_en.name AS name_en, p.gst_percentage
       FROM products p
       LEFT JOIN product_translations pt_en ON p.id = pt_en.product_id AND pt_en.lang_code = 'en'
       WHERE p.is_active = TRUE
       ORDER BY p.gst_percentage, p.id`,
    );
    const byRate = {};
    rows.forEach((r) => {
      const rate = String(r.gst_percentage);
      if (!byRate[rate]) byRate[rate] = [];
      byRate[rate].push({
        id: r.id,
        name: r.name_en,
        gstRate: parseFloat(r.gst_percentage),
      });
    });
    return { gstRates: byRate, rates: Object.keys(byRate).map(Number).sort() };
  }
  static async updateGSTConfig(id, data) {
    const { cgst_rate, sgst_rate } = data;
    const total =
      parseFloat(cgst_rate || 0) + parseFloat(sgst_rate || 0) ||
      data.igst_rate ||
      null;
    if (total !== null) {
      await dbModify("UPDATE products SET gst_percentage = $1 WHERE id = $2", [
        total,
        id,
      ]);
    }
    return this.getGSTConfig();
  }
  static async getBusinessStats(period = "month") {
    const dateMap = {
      today: "0 days",
      week: "7 days",
      month: "30 days",
      year: "365 days",
    };
    const interval = dateMap[period] || "30 days";
    const stats = await query(
      `SELECT
         COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '${interval}')              AS orders,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.status='picked_up'
                  AND o.created_at >= NOW() - INTERVAL '${interval}'), 0)                    AS revenue,
         COUNT(*) FILTER (WHERE o.status='pending'
                  AND o.created_at >= NOW() - INTERVAL '${interval}')                        AS pending
       FROM orders o`,
    );
    return { period, ...stats[0] };
  }
  static async getPendingOrdersStats() {
    const row = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='pending')          AS pending,
         COUNT(*) FILTER (WHERE status='confirmed')        AS confirmed,
         COUNT(*) FILTER (WHERE status='ready_for_pickup') AS ready
       FROM orders`,
    );
    return row[0];
  }
  static async getRecentActivity(limit = 20) {
    return AdminLog.getRecentActivity(parseInt(limit) || 20);
  }
  static async getSystemHealth() {
    const { pool } = require("../config/database");
    let dbStatus = "ok";
    let dbLatency = 0;
    try {
      const start = Date.now();
      await pool.query("SELECT 1");
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = "error";
    }
    const mem = process.memoryUsage();
    return {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      uptime: Math.floor(process.uptime()),
      database: { status: dbStatus, latencyMs: dbLatency },
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + "MB",
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + "MB",
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + "MB",
      },
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",
    };
  }
  static async exportData(type, options = {}) {
    const { startDate, endDate, format } = options;
    const today = new Date().toISOString().split("T")[0];
    const start = startDate || "2020-01-01";
    const end = endDate || today;
    let rows;
    switch (type) {
      case "products":
        rows = await query(
          `SELECT p.sku, pt_en.name AS name_en, ct_en.name AS category,
                  p.price, p.gst_percentage, p.stock_quantity, p.unit_type, p.is_active
           FROM products p
           JOIN categories c ON p.category_id = c.id
           ${PROD_TRANS_JOIN}
           ORDER BY ct_en.name, pt_en.name`,
        );
        break;
      case "orders":
        rows = await query(
          `SELECT o.order_number, u.name AS customer, u.phone, o.status,
                  o.subtotal, o.total_gst, o.total_amount, o.created_at
           FROM orders o JOIN users u ON o.user_id = u.id
           WHERE o.created_at >= $1::date AND o.created_at < ($2::date + interval '1 day')
           ORDER BY o.created_at DESC`,
          [start, end],
        );
        break;
      case "customers":
        rows = await query(
          `SELECT u.name, u.phone, u.email, u.user_type, u.is_active, u.created_at
           FROM users u WHERE u.user_type IN ('retail','wholesale')
           ORDER BY u.created_at DESC`,
        );
        break;
      case "invoices":
        rows = await query(
          `SELECT i.invoice_number, u.name AS customer, i.subtotal,
                  i.total_gst, i.total_amount, i.payment_status, i.created_at
           FROM invoices i JOIN orders o ON i.order_id = o.id JOIN users u ON o.user_id = u.id
           WHERE i.created_at >= $1::date AND i.created_at < ($2::date + interval '1 day')
           ORDER BY i.created_at DESC`,
          [start, end],
        );
        break;
      case "inventory":
        rows = await query(
          `SELECT p.sku, p.name_en, c.name_en AS category, p.stock_quantity,
                  p.price, p.is_active
           FROM products p JOIN categories c ON p.category_id = c.id
           ORDER BY p.stock_quantity ASC`,
        );
        break;
      default:
        rows = [];
    }
    if (format === "csv" && rows.length > 0) {
      const headers = Object.keys(rows[0]).join(",");
      const csvRows = rows.map((r) =>
        Object.values(r)
          .map((v) => (v === null ? "" : String(v).replace(/,/g, ";")))
          .join(","),
      );
      return [headers, ...csvRows].join("\n");
    }
    return { type, count: rows.length, data: rows };
  }
}
module.exports = AdminService;

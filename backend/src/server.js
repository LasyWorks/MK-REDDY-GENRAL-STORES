// Catch crashes that happen before logger initializes
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

const app = require("./app");
const config = require("./config");
const {
  pool,
  testConnection,
  testMySQLConnection,
  pgPool,
  mysqlPool,
  DB_TYPE,
  isFailedOver,
} = require("./config/database");
const logger = require("./utils/logger");
const dbSyncService = require('./services/dbSyncService');
const { AdminNotification } = require('./models');
const stockAlertService = require('./services/stockAlertService');
// cPanel Passenger sets PORT env var — always respect it
const PORT = process.env.PORT || config.port || 5001;

// Sync interval: every 5 minutes (configurable via SYNC_INTERVAL_MS)
const SYNC_INTERVAL =
  parseInt(process.env.SYNC_INTERVAL_MS, 10) || 5 * 60 * 1000;
// Backup interval: every 1 hour
const BACKUP_INTERVAL =
  parseInt(process.env.BACKUP_INTERVAL_MS, 10) || 60 * 60 * 1000;
// MySQL health-check interval during failover: every 30 seconds
const FAILOVER_CHECK_INTERVAL = 30 * 1000;

let syncTimer = null;
let backupTimer = null;
let failoverCheckTimer = null;

/**
 * Start background sync: MySQL → Supabase (only when DB_TYPE=mysql)
 */
function startSyncScheduler() {
  if (DB_TYPE !== "mysql" || !pgPool || !mysqlPool) {
    logger.info("Sync scheduler skipped (not in dual-DB mode)");
    return;
  }

  logger.info(
    `🔄 Sync scheduler: MySQL→Supabase every ${SYNC_INTERVAL / 1000}s`,
  );
  logger.info(
    `📦 Backup scheduler: JSON file every ${BACKUP_INTERVAL / 1000}s`,
  );

  // Initial sync after 10 seconds (let server stabilize)
  setTimeout(async () => {
    try {
      logger.info("🔄 Running initial sync MySQL → Supabase...");
      const summary = await dbSyncService.syncAll(mysqlPool, pgPool);
      logger.info(
        `✅ Initial sync done: ${summary.tablesSynced}/${summary.tablesTotal} tables in ${summary.durationMs}ms`,
      );
    } catch (err) {
      logger.error("Initial sync failed: " + err.message);
    }
  }, 10000);

  // Periodic sync
  syncTimer = setInterval(async () => {
    if (isFailedOver()) {
      logger.warn("Sync skipped — currently in failover mode");
      return;
    }
    try {
      const summary = await dbSyncService.syncAll(mysqlPool, pgPool);
      logger.info(
        `🔄 Sync complete: ${summary.tablesSynced}/${summary.tablesTotal} tables in ${summary.durationMs}ms`,
      );
    } catch (err) {
      logger.error("Periodic sync failed: " + err.message);
    }
  }, SYNC_INTERVAL);

  // Periodic backup
  backupTimer = setInterval(async () => {
    try {
      const result = await dbSyncService.writeBackupFile(mysqlPool);
      logger.info(`📦 Backup saved: ${result.filePath}`);
    } catch (err) {
      logger.error("Backup failed: " + err.message);
    }
  }, BACKUP_INTERVAL);

  // Failover recovery checker
  failoverCheckTimer = setInterval(async () => {
    if (!isFailedOver()) return;
    logger.info("🔍 Checking if MySQL has recovered...");
    const recovered = await testMySQLConnection();
    if (recovered) {
      logger.info(
        "✅ MySQL recovered! Syncing Supabase → MySQL to catch up on writes made during outage...",
      );
      try {
        const summary = await dbSyncService.syncSupabaseToMySQL(
          pgPool,
          mysqlPool,
        );
        logger.info(
          `🔄 Reverse sync done: ${summary.tablesSynced}/${summary.tablesTotal} tables in ${summary.durationMs}ms`,
        );
        if (summary.tablesFailed > 0) {
          logger.warn(
            `⚠️  ${summary.tablesFailed} table(s) failed reverse sync: ${summary.errors.map((e) => e.table).join(", ")}`,
          );
        }
      } catch (err) {
        logger.error("Reverse sync (Supabase → MySQL) failed: " + err.message);
      }
    }
  }, FAILOVER_CHECK_INTERVAL);
}

/**
 * Run once at startup:
 *   1. Ensure admin_notifications table exists.
 *   2. Scan all active low/out-of-stock products.
 *   3. For each, call checkAndAlert — which handles deduplication and 3-day resend.
 *      (New product => create notification + send email)
 *      (Already alerted < 3 days ago => skip)
 *      (Already alerted 3+ days ago => resend)
 */
async function checkLowStockOnStartup() {
  try {
    await AdminNotification.ensureTable();
    logger.info('[stock-alert] admin_notifications table ready.');
  } catch (err) {
    logger.error('[stock-alert] failed to ensure notifications table:', err);
    return;
  }

  try {
    const { query: dbQuery, modify: dbModify } = require('./config/database');

    // Remove notification rows where email was never delivered (email_sent_at IS NULL).
    // These are left over from a previous startup that crashed before email delivery.
    // checkAndAlert will re-create them this run and properly send the email.
    await dbModify(
      `DELETE FROM admin_notifications WHERE email_sent_at IS NULL AND resolved_at IS NULL`
    ).catch(() => {});
    const rows = await dbQuery(
      `SELECT p.id, p.sku, p.variant, p.unit_pack_size,
              p.stock_quantity, p.low_stock_threshold,
              COALESCE(pt.name, p.sku, 'Unknown') AS name
       FROM products p
       LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
       WHERE p.is_active = TRUE
         AND p.stock_quantity <= COALESCE(p.low_stock_threshold, 10)
       ORDER BY p.stock_quantity ASC`
    );

    if (!rows || !rows.length) {
      logger.info('[stock-alert] No low/out-of-stock products at startup.');
      return;
    }

    logger.info(`[stock-alert] Found ${rows.length} low/out-of-stock product(s) at startup — checking alerts.`);
    for (const row of rows) {
      const product = {
        id: row.id,
        name: row.name,
        sku: row.sku,
        variant: row.variant,
        unit_pack_size: row.unit_pack_size,
        stock_quantity: parseFloat(row.stock_quantity),
        low_stock_threshold: parseFloat(row.low_stock_threshold ?? 10),
      };
      await stockAlertService.checkAndAlert(product);
    }
  } catch (err) {
    logger.error('[stock-alert] startup scan failed:', err);
  }
}

async function startServer() {
  try {
    logger.info("Testing database connection...");
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error(
        "Failed to connect to database. Please check your database configuration.",
      );
      process.exit(1);
    }
    logger.info("Database connection successful");
    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏪 MK Reddy General Stores API Server                       ║
║                                                               ║
║   Environment: ${(config.env || "development").padEnd(44)}║
║   Port: ${PORT.toString().padEnd(51)}║
║   Database: ${(DB_TYPE === "mysql" ? "MySQL (primary) + Supabase (backup)" : config.database.name || "mk_reddy_genral_stores").padEnd(47)}║
║                                                               ║
║   API Base URL: http://localhost:${PORT}/api/v1                  ║
║   Health Check: http://localhost:${PORT}/api/v1/health           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
      // Start background sync after server is listening
      startSyncScheduler();
      // Scan for products that are already low / out-of-stock at startup
      checkLowStockOnStartup();
    });
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      // Stop sync timers
      if (syncTimer) clearInterval(syncTimer);
      if (backupTimer) clearInterval(backupTimer);
      if (failoverCheckTimer) clearInterval(failoverCheckTimer);
      server.close(async () => {
        logger.info("HTTP server closed");
        try {
          if (pool && pool.end) await pool.end();
          if (DB_TYPE === "mysql" && pgPool && pgPool.end) await pgPool.end();
          logger.info("Database connections closed");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      });
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down",
        );
        process.exit(1);
      }, 30000);
    };
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}
startServer();

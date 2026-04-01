require("dotenv").config({ path: __dirname + "/../.env" });

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

const app = require("./app");
const config = require("./config");
const { testConnection, queryOne } = require("./config/database");
const logger = require("./utils/logger");
const stockAlertPolicy = require("./config/stockAlertPolicy");
const { runBootstrapMigrations } = require("./database/bootstrapMigrations");

const DB_PING_INTERVAL_MS = 60 * 60 * 1000;
const PENDING_ORDER_SCAN_INTERVAL_MS = 60 * 60 * 1000;
const BIRTHDAY_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PORT = process.env.PORT || config.port || 5001;

async function init() {
  try {
    logger.info("Testing database connection...");
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error("Failed to connect to database.");
      process.exit(1);
    }
    logger.info("Database connection successful");
    await runBootstrapMigrations();

    const runDbKeepAlive = async () => {
      try {
        await queryOne("SELECT 1 AS ok");
        logger.info("[db-ping] Hourly database keepalive query completed successfully");
      } catch (err) {
        logger.error(`[db-ping] Hourly database keepalive query failed: ${err.message}`);
      }
    };

    // Background job: enforce stock alert policy windows.
    const runStockAlertScan = async () => {
      try {
        const stockAlertService = require("./services/stockAlertService");
        const result = await stockAlertService.runScheduledDispatch();
        if (result?.emailSent || result?.notificationSent) {
          logger.info(
            `[stock-alert-bg] dispatch completed: issues=${result.issues}, emailSent=${result.emailSent}, notificationSent=${result.notificationSent}`,
          );
        }
      } catch (err) {
        logger.error("[stock-alert-bg] Background stock scan failed:", err);
      }
    };

    const runPendingOrderScan = async () => {
      try {
        const pendingOrderAlertService = require("./services/pendingOrderAlertService");
        const result = await pendingOrderAlertService.runFullScan();
        if (result?.alerted) {
          logger.info(
            `[pending-order-bg] scan completed: scanned=${result.scanned}, alerted=${result.alerted}`,
          );
        }
      } catch (err) {
        logger.error("[pending-order-bg] Background pending-order scan failed:", err);
      }
    };

    const runBirthdayCampaignScan = async () => {
      try {
        const birthdayCampaignService = require("./services/birthdayCampaignService");
        const result = await birthdayCampaignService.runDailyCampaign();
        if (result?.totalSent) {
          logger.info(`[birthday-campaign-bg] daily scan sent=${result.totalSent}`);
        }
      } catch (err) {
        logger.error("[birthday-campaign-bg] Background birthday campaign scan failed:", err);
      }
    };

    // Trigger once at startup, then keep the DB connection warm every hour.
    await runDbKeepAlive();
    setInterval(runDbKeepAlive, DB_PING_INTERVAL_MS);

    // Run stock alert policy dispatcher on startup, then every minute.
    const STOCK_ALERT_INTERVAL_MS = stockAlertPolicy.schedulerIntervalMs;
    setTimeout(() => {
      runStockAlertScan();
      setInterval(runStockAlertScan, STOCK_ALERT_INTERVAL_MS);
    }, 30000); // 30 second startup delay

    // Run pending-order reminder scan on startup, then hourly.
    setTimeout(() => {
      runPendingOrderScan();
      setInterval(runPendingOrderScan, PENDING_ORDER_SCAN_INTERVAL_MS);
    }, 45000);

    // Run birthday campaign scan on startup, then daily.
    setTimeout(() => {
      runBirthdayCampaignScan();
      setInterval(runBirthdayCampaignScan, BIRTHDAY_SCAN_INTERVAL_MS);
    }, 60000);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${config.env}]`);
    });
  } catch (error) {
    logger.error("Failed to initialize:", error);
    process.exit(1);
  }
}

init();

module.exports = app;

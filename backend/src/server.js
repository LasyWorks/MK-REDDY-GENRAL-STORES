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

const DB_PING_INTERVAL_MS = 60 * 60 * 1000;
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

    const runDbKeepAlive = async () => {
      try {
        await queryOne("SELECT 1 AS ok");
        logger.info("[db-ping] Hourly database keepalive query completed successfully");
      } catch (err) {
        logger.error(`[db-ping] Hourly database keepalive query failed: ${err.message}`);
      }
    };

    // Background job: scan stock levels every 6 hours and send alerts
    const runStockAlertScan = async () => {
      try {
        const stockAlertService = require("./services/stockAlertService");
        logger.info("[stock-alert-bg] Starting background stock level scan...");
        const result = await stockAlertService.runFullScan();
        logger.info(`[stock-alert-bg] Scan completed: scanned=${result.scanned}, alerted=${result.alerted}`);
      } catch (err) {
        logger.error("[stock-alert-bg] Background stock scan failed:", err);
      }
    };

    // Trigger once at startup, then keep the DB connection warm every hour.
    await runDbKeepAlive();
    setInterval(runDbKeepAlive, DB_PING_INTERVAL_MS);

    // Run stock alert scan on startup (after 30s delay to let system settle), then every 6 hours
    const STOCK_ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
    setTimeout(() => {
      runStockAlertScan();
      setInterval(runStockAlertScan, STOCK_ALERT_INTERVAL_MS);
    }, 30000); // 30 second startup delay

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

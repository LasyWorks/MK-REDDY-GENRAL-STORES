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
const { pool, testConnection } = require("./config/database");
const logger = require("./utils/logger");
const stockAlertService = require("./services/stockAlertService");

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

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${config.env}]`);

      // Startup backfill: ensure existing low/out-of-stock items create alerts and emails.
      stockAlertService
        .runFullScan()
        .then((result) => {
          logger.info(`[stock-alert] startup scan done: scanned=${result.scanned}, alerted=${result.alerted}`);
        })
        .catch((err) => {
          logger.error("[stock-alert] startup scan failed:", err);
        });
    });

    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Shutting down...`);
      server.close(async () => {
        if (pool && pool.end) await pool.end();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 30000);
    };
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to initialize:", error);
    process.exit(1);
  }
}

init();

module.exports = app;

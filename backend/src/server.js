const app = require('./app');
const config = require('./config');
const { pool, testConnection } = require('./config/database');
const logger = require('./utils/logger');
const PORT = config.port;
async function startServer() {
  try {
    logger.info('Testing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error('Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }
    logger.info('Database connection successful');
    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏪 MK Reddy General Stores API Server                       ║
║                                                               ║
║   Environment: ${(config.env || 'development').padEnd(44)}║
║   Port: ${PORT.toString().padEnd(51)}║
║   Database: ${(config.database.name || 'mk_reddy_genral_stores').padEnd(47)}║
║                                                               ║
║   API Base URL: http://localhost:${PORT}/api/v1                  ║
║   Health Check: http://localhost:${PORT}/api/v1/health           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await pool.end();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}
startServer();
/**
 * Health check routes for monitoring system status
 */

const express = require('express');
const router = express.Router();
const { dbMonitor } = require('../config/database');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Basic health check endpoint
 * Returns 200 if server is running
 */
router.get('/', asyncHandler(async (req, res) => {
  ApiResponse.success(res, { 
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }, 'Service is running');
}));

/**
 * Detailed health check with database status
 * Requires admin authentication for security
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const healthStatus = await dbMonitor.performHealthCheck();
  const metrics = dbMonitor.getMetrics();
  
  ApiResponse.success(res, {
    status: healthStatus.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: healthStatus,
    metrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }, 'Health check completed');
}));

/**
 * Database metrics endpoint
 * Returns detailed database connection pool statistics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = dbMonitor.getMetrics();
  
  ApiResponse.success(res, metrics, 'Database metrics retrieved');
}));

module.exports = router;

/**
 * Database Connection Monitoring Service
 * Monitors PostgreSQL connection pool health, query performance, and connection lifecycle
 */

const logger = require('./logger');
const { sendSecurityAlert } = require('./alerting');

class DatabaseMonitor {
  constructor(pool, config = {}) {
    this.pool = pool;
    this.slowQueryThreshold = config.slowQueryThreshold || 1000; // 1 second
    this.checkInterval = config.checkInterval || 60000; // 1 minute
    this.maxIdleConnections = config.maxIdleConnections || 5;
    this.minAvailableConnections = config.minAvailableConnections || 2;
    
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      connectionErrors: 0,
      lastHealthCheck: null,
    };
    
    this.isMonitoring = false;
    this.healthCheckTimer = null;
  }
  
  /**
   * Start monitoring the database connection pool
   */
  start() {
    if (this.isMonitoring) {
      logger.warn('[DB Monitor] Already monitoring');
      return;
    }
    
    this.isMonitoring = true;
    logger.info('[DB Monitor] Starting database connection monitoring');
    
    // Listen to pool events
    this.attachPoolEventListeners();
    
    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
    
    // Initial health check
    this.performHealthCheck();
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    logger.info('[DB Monitor] Stopped database connection monitoring');
  }
  
  /**
   * Attach event listeners to the connection pool
   */
  attachPoolEventListeners() {
    // Connection acquired from pool
    this.pool.on('connect', (client) => {
      logger.debug('[DB Monitor] New database connection established');
    });
    
    // Client connection error
    this.pool.on('error', (err, client) => {
      this.metrics.connectionErrors++;
      logger.error('[DB Monitor] Unexpected database client error:', err.message);
      
      sendSecurityAlert({
        type: 'DATABASE_ERROR',
        severity: 'HIGH',
        message: 'Database client error detected',
        details: {
          error: err.message,
          stack: err.stack,
        },
      });
    });
    
    // Pool connection acquisition
    this.pool.on('acquire', (client) => {
      logger.debug('[DB Monitor] Connection acquired from pool');
    });
    
    // Pool connection release
    this.pool.on('release', (err, client) => {
      if (err) {
        logger.error('[DB Monitor] Error releasing connection:', err.message);
      }
    });
    
    // Pool connection removal (disconnection)
    this.pool.on('remove', (client) => {
      logger.debug('[DB Monitor] Connection removed from pool');
    });
  }
  
  /**
   * Perform periodic health check
   */
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW(), current_database(), version()');
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      // Get pool statistics
      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };
      
      this.metrics.lastHealthCheck = new Date();
      
      logger.info('[DB Monitor] Health check passed', {
        responseTime: `${responseTime}ms`,
        ...poolStats,
      });
      
      // Alert if response time is slow
      if (responseTime > this.slowQueryThreshold) {
        logger.warn('[DB Monitor] Slow health check response time:', responseTime);
      }
      
      // Alert if too many idle connections
      if (poolStats.idleCount > this.maxIdleConnections) {
        logger.warn('[DB Monitor] High number of idle connections:', poolStats.idleCount);
      }
      
      // Alert if low available connections
      const availableConnections = poolStats.totalCount - (poolStats.idleCount + poolStats.waitingCount);
      if (availableConnections < this.minAvailableConnections) {
        logger.warn('[DB Monitor] Low available connections:', availableConnections);
        
        sendSecurityAlert({
          type: 'DATABASE_PERFORMANCE',
          severity: 'MEDIUM',
          message: 'Low database connection availability',
          details: poolStats,
        });
      }
      
      return {
        healthy: true,
        responseTime,
        ...poolStats,
      };
      
    } catch (error) {
      this.metrics.connectionErrors++;
      logger.error('[DB Monitor] Health check failed:', error.message);
      
      sendSecurityAlert({
        type: 'DATABASE_ERROR',
        severity: 'HIGH',
        message: 'Database health check failed',
        details: {
          error: error.message,
          stack: error.stack,
        },
      });
      
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Wrap query execution with performance monitoring
   * @param {Function} queryFn - Query function to execute
   * @param {string} queryName - Name/identifier for the query
   */
  async monitorQuery(queryFn, queryName = 'unnamed') {
    const startTime = Date.now();
    this.metrics.totalQueries++;
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        this.metrics.slowQueries++;
        logger.warn(`[DB Monitor] Slow query detected: ${queryName}`, {
          duration: `${duration}ms`,
        });
        
        sendSecurityAlert({
          type: 'DATABASE_PERFORMANCE',
          severity: 'LOW',
          message: `Slow query detected: ${queryName}`,
          details: {
            duration: `${duration}ms`,
            query: queryName,
          },
        });
      }
      
      return result;
      
    } catch (error) {
      this.metrics.failedQueries++;
      logger.error(`[DB Monitor] Query failed: ${queryName}`, error.message);
      throw error;
    }
  }
  
  /**
   * Get current monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      pool: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      },
    };
  }
  
  /**
   * Reset metrics counters
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      connectionErrors: 0,
      lastHealthCheck: this.metrics.lastHealthCheck,
    };
    
    logger.info('[DB Monitor] Metrics reset');
  }
}

module.exports = DatabaseMonitor;

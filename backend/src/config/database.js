const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');
const DatabaseMonitor = require('../utils/databaseMonitor');

const pool = new Pool({
  host:     config.database.host,
  port:     config.database.port,
  user:     config.database.user,
  password: config.database.password,
  database: config.database.name,
  // Shared hosting: keep pool small to stay within resource limits
  max:      parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 5,
  min:      1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.database.ssl,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: 'mk-reddy-stores-api'
});

pool.on('error', (err) => {
  // Log unexpected errors to prevent silent failures
  logger.error('Unexpected PG pool error', err);
});

// Initialize database monitoring
const dbMonitor = new DatabaseMonitor(pool, {
  slowQueryThreshold: 1000,    // 1 second
  checkInterval: 60000,         // 1 minute
  maxIdleConnections: 5,
  minAvailableConnections: 2,
});

// Start monitoring in production
if (process.env.NODE_ENV === 'production') {
  dbMonitor.start();
}
const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    // All queries must succeed or all fail - prevents partial order creation
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};
const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};
const insert = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows[0]?.id ?? result.rows[0];
};
const modify = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rowCount;
};
module.exports = {
  pool,
  dbMonitor,
  testConnection,
  withTransaction,
  query,
  queryOne,
  insert,
  modify,
};
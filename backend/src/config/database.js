const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
  host:     config.database.host,
  port:     config.database.port,
  user:     config.database.user,
  password: config.database.password,
  database: config.database.name,
  max:      config.database.connectionLimit,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.database.ssl,
});

pool.on('error', (err) => {
  logger.error('Unexpected PG pool error', err);
});

// Test connection
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

// Transaction helper
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Query helper — returns rows array
const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

// Get single row
const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

// Insert with RETURNING id
const insert = async (sql, params = []) => {
  // Caller must include RETURNING id in the SQL
  const result = await pool.query(sql, params);
  return result.rows[0]?.id ?? result.rows[0];
};

// Update/Delete — returns rowCount
const modify = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rowCount;
};

module.exports = {
  pool,
  testConnection,
  withTransaction,
  query,
  queryOne,
  insert,
  modify,
};

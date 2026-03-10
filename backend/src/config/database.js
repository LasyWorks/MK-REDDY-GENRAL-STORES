const config = require("../config");
const logger = require("../utils/logger");

let DatabaseMonitor;
try {
  DatabaseMonitor = require("../utils/databaseMonitor");
} catch (_) {}

const { Pool } = require("pg");
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  max: config.database.connectionLimit || 10,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.database.ssl,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: "mk-reddy-stores-api",
});
pool.on("error", (err) => logger.error("Unexpected PG pool error", err));

let dbMonitor = null;
if (DatabaseMonitor) {
  dbMonitor = new DatabaseMonitor(pool, {
    slowQueryThreshold: 1000,
    checkInterval: 60000,
    maxIdleConnections: 5,
    minAvailableConnections: 2,
  });
}

const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    logger.info("[POSTGRES] Database connection established successfully");
    return true;
  } catch (error) {
    logger.error("Database connection failed: " + error.message);
    return false;
  }
};

const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
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
  pgPool: pool,
  dbMonitor,
  testConnection,
  withTransaction,
  query,
  queryOne,
  insert,
  modify,
};

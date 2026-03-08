// ─────────────────────────────────────────────────────────────────────────────
// database.js — Dual-database adapter (MySQL primary + Supabase/PG backup)
//
// DB_TYPE=mysql   → MySQL is primary, Supabase is auto-synced backup
// DB_TYPE=postgres → Supabase/PG only (legacy mode)
//
// On MySQL failure the adapter can failover to Supabase automatically.
// A background sync service keeps Supabase in sync with MySQL writes.
// ─────────────────────────────────────────────────────────────────────────────

const config = require("../config");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const DB_TYPE = (process.env.DB_TYPE || "postgres").toLowerCase();

// ─── PostgreSQL (Supabase) setup — always initialised for backup ─────────────
let pgPool = null;
let DatabaseMonitor;
try {
  DatabaseMonitor = require("../utils/databaseMonitor");
} catch (_) {}

// Always create pgPool so it can serve as backup when DB_TYPE=mysql
try {
  const { Pool } = require("pg");
  pgPool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    max: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 5,
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
  pgPool.on("error", (err) => logger.error("Unexpected PG pool error", err));
} catch (err) {
  logger.warn(
    "PostgreSQL (pg) driver not available — Supabase backup disabled",
  );
}

// ─── MySQL setup ─────────────────────────────────────────────────────────────
let mysqlPool = null;

if (DB_TYPE === "mysql") {
  const mysql = require("mysql2/promise");
  mysqlPool = mysql.createPool({
    host: config.database.mysqlHost || config.database.host || "localhost",
    port: config.database.mysqlPort || 3306,
    user: config.database.mysqlUser || config.database.user,
    password: config.database.mysqlPassword || config.database.password,
    database: config.database.mysqlName || config.database.name,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 5,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "+00:00",
    // Fail fast so the Supabase failover activates within seconds, not minutes
    connectTimeout: 5000,
    acquireTimeout: 5000,
  });
}

// Expose pool for backward compat (databaseMonitor, etc.)
const pool = DB_TYPE === "mysql" ? mysqlPool : pgPool;

// ─── Failover state ──────────────────────────────────────────────────────────
let _failedOver = false; // true when MySQL is down and we're using Supabase
let _failoverAt = null;

function isFailedOver() {
  return _failedOver;
}

function activateFailover() {
  if (_failedOver) return;
  _failedOver = true;
  _failoverAt = new Date();
  logger.error("⚠️  MySQL DOWN — failing over to Supabase backup");
}

function deactivateFailover() {
  if (!_failedOver) return;
  _failedOver = false;
  _failoverAt = null;
  logger.info("✅  MySQL recovered — switching back from Supabase");
}

// ─── DB Monitor (Postgres only, legacy mode) ────────────────────────────────
let dbMonitor = null;
if (DB_TYPE !== "mysql" && DatabaseMonitor && pgPool) {
  dbMonitor = new DatabaseMonitor(pgPool, {
    slowQueryThreshold: 1000,
    checkInterval: 60000,
    maxIdleConnections: 5,
    minAvailableConnections: 2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MySQL query translator — converts PostgreSQL SQL to MySQL-compatible SQL.
// All models use PostgreSQL syntax; this layer bridges the gap transparently.
// ─────────────────────────────────────────────────────────────────────────────
function translateForMySQL(sql, params = []) {
  let s = sql;
  let p = [...params];

  // 1. ARRAY(SELECT col FROM ... WHERE ... LIMIT n) → JSON subquery
  //    MySQL: (SELECT JSON_ARRAYAGG(col) FROM (SELECT col FROM ... LIMIT n) _arr)
  s = s.replace(
    /ARRAY\s*\(\s*(SELECT\s+(\S+)\s+FROM\s+([\s\S]+?))\s*\)/gi,
    (_, inner, col) =>
      `(SELECT JSON_ARRAYAGG(${col}) FROM (${inner}) _arr_sub)`,
  );

  // 2. COALESCE(..., 0)::int  and similar type casts  ::type or ::type[]
  s = s.replace(/::[a-zA-Z_]+(?:\[\])?/g, "");

  // 3. ILIKE → LIKE  (MySQL LIKE is case-insensitive on utf8mb4_unicode_ci)
  s = s.replace(/ILIKE/gi, "LIKE");

  // 4. Interval: ($n * INTERVAL '1 second')  →  INTERVAL ? SECOND
  s = s.replace(
    /\(\s*\$\d+\s*\*\s*INTERVAL\s+'1\s+second'\s*\)/gi,
    "INTERVAL ? SECOND",
  );

  // 5. PostgreSQL UPDATE ... SET ... FROM t2 WHERE ...
  //    → MySQL UPDATE t1 JOIN t2 ON ... SET ...
  s = translateUpdateFrom(s);

  // 6.  = ANY($n)  with array params → expand to IN (?,?,?)
  //     We need to detect which param index and expand the array
  s = s.replace(/=\s*ANY\s*\(\s*\$(\d+)\s*\)/gi, (_, idx) => {
    const paramIdx = parseInt(idx, 10) - 1;
    const arr = p[paramIdx];
    if (!Array.isArray(arr)) return `= ?`;
    const placeholders = arr.map(() => "?").join(", ");
    // Splice the array values into params at correct position
    p.splice(paramIdx, 1, ...arr);
    return `IN (${placeholders})`;
  });

  // 7. Strip RETURNING clause (save whether it existed)
  const hasReturning = /RETURNING\s+\S+/i.test(s);
  s = s.replace(/\s*RETURNING\s+\S+/gi, "");

  // 8. $n → ? (positional params → positional for MySQL)
  s = s.replace(/\$\d+/g, "?");

  // 9. TRUE/FALSE literals (safe in MySQL 8 but belt-and-suspenders)
  // mysql2 handles JS booleans correctly; no change needed.

  return { sql: s.trim(), params: p, hasReturning };
}

/**
 * Translate PostgreSQL-style UPDATE...FROM into MySQL JOIN syntax.
 * Uses paren-depth tracking to distinguish top-level FROM from sub-select FROM.
 *
 * PostgreSQL:  UPDATE t1 SET col=x FROM t2 WHERE t1.fk = t2.pk
 * MySQL:       UPDATE t1 JOIN t2 ON t1.fk = t2.pk SET col=x
 */
function translateUpdateFrom(sql) {
  const upper = sql.toUpperCase();
  const setIdx = upper.search(/\bSET\b/);
  if (setIdx === -1) return sql;

  // Walk after SET, track paren depth, find top-level FROM and WHERE
  let depth = 0;
  let topoFromIdx = -1;
  let topoWhereIdx = -1;

  for (let i = setIdx + 3; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      continue;
    }
    if (depth !== 0) continue;
    const rest = upper.slice(i);
    if (/^FROM\s/.test(rest) && topoFromIdx === -1) {
      topoFromIdx = i;
      continue;
    }
    if (/^WHERE\s/.test(rest)) {
      topoWhereIdx = i;
      break;
    }
  }

  // Only translate if there is a top-level FROM *before* the top-level WHERE
  if (topoFromIdx === -1 || topoWhereIdx === -1 || topoFromIdx > topoWhereIdx)
    return sql;

  const updateTable = sql.slice(0, setIdx).trim(); // e.g.  UPDATE pp  or  UPDATE promotion_products pp
  const setClause = sql.slice(setIdx + 3, topoFromIdx).trim();
  const fromPart = sql.slice(topoFromIdx + 4, topoWhereIdx).trim(); // e.g.  order_items oi
  const conditions = sql.slice(topoWhereIdx + 5).trim(); // everything after WHERE

  return `${updateTable} JOIN ${fromPart} ON ${conditions} SET ${setClause}`;
}

/**
 * Post-process MySQL result rows: parse JSON array strings into real arrays.
 * (e.g. item_images returned by JSON_ARRAYAGG)
 */
function postProcessRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string" && v.startsWith("[") && v.endsWith("]")) {
        try {
          out[k] = JSON.parse(v);
        } catch {
          out[k] = v;
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MySQL client wrapper — makes a mysql2 connection look like a pg connection
// (has .query() returning { rows, rowCount }) for use inside withTransaction.
// ─────────────────────────────────────────────────────────────────────────────
function makeMysqlClient(conn) {
  return {
    _conn: conn,
    async query(sql, params = []) {
      const trimmed = sql.trim().toUpperCase();
      const isInsert = trimmed.startsWith("INSERT");

      // Pre-generate UUID for INSERT without explicit id column
      let generatedId = null;
      let execSql = sql;
      let execParams = Array.isArray(params) ? [...params] : [];

      if (isInsert && /RETURNING\s+id/i.test(sql)) {
        generatedId = uuidv4();
        // Inject `id` as first column if not already present
        if (!/INSERT\s+INTO\s+\w+\s*\(\s*id\s*[,)]/i.test(sql)) {
          execSql = sql.replace(
            /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(/i,
            (_, tbl, cols) => `INSERT INTO ${tbl} (id, ${cols}) VALUES (?,`,
          );
          execParams = [generatedId, ...execParams];
        }
      }

      const { sql: msql, params: mparams } = translateForMySQL(
        execSql,
        execParams,
      );
      const [result, fields] = await conn.query(msql, mparams);

      if (isInsert) {
        const id = generatedId || result.insertId || null;
        return { rows: [{ id }], rowCount: result.affectedRows || 1 };
      }
      const rows = postProcessRows(Array.isArray(result) ? result : [result]);
      return { rows, rowCount: result.affectedRows ?? rows.length };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — identical interface regardless of DB_TYPE
// Supports automatic failover: MySQL → Supabase when MySQL is unreachable.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if we should use PG (failover) for the current request.
 */
function _usePg() {
  return DB_TYPE === "mysql" && _failedOver && pgPool != null;
}

const testConnection = async () => {
  try {
    if (DB_TYPE === "mysql" && !_failedOver) {
      const conn = await mysqlPool.getConnection();
      await conn.query("SELECT 1");
      conn.release();
      deactivateFailover();
    } else if (pgPool) {
      const client = await pgPool.connect();
      await client.query("SELECT 1");
      client.release();
    }
    logger.info(
      `[${_usePg() ? "FAILOVER-PG" : DB_TYPE.toUpperCase()}] Database connection established successfully`,
    );
    return true;
  } catch (error) {
    logger.error("Database connection failed: " + error.message);
    console.error("DB CONNECTION ERROR:", error.message, error.code || "");
    if (DB_TYPE === "mysql" && pgPool && !_failedOver) {
      try {
        const client = await pgPool.connect();
        await client.query("SELECT 1");
        client.release();
        activateFailover();
        return true;
      } catch (pgErr) {
        logger.error("Supabase backup also unreachable: " + pgErr.message);
      }
    }
    return false;
  }
};

const testMySQLConnection = async () => {
  if (DB_TYPE !== "mysql" || !mysqlPool) return false;
  try {
    const conn = await mysqlPool.getConnection();
    await conn.query("SELECT 1");
    conn.release();
    deactivateFailover();
    return true;
  } catch {
    return false;
  }
};

const _isMysqlConnError = (error) =>
  error.code === "ECONNREFUSED" ||
  error.code === "ETIMEDOUT" ||
  error.code === "ENOTFOUND" ||
  error.code === "ECONNRESET" ||
  error.code === "PROTOCOL_CONNECTION_LOST" ||
  error.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" ||
  error.code === "ER_ACCESS_DENIED_ERROR" ||
  error.code === "POOL_CLOSED" ||
  (error.message && /connect|ECONNREFUSED|lost|timeout/i.test(error.message));

const withTransaction = async (callback) => {
  if (_usePg()) {
    const client = await pgPool.connect();
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
  }

  if (DB_TYPE === "mysql") {
    try {
      const conn = await mysqlPool.getConnection();
      await conn.beginTransaction();
      const client = makeMysqlClient(conn);
      try {
        const result = await callback(client);
        await conn.commit();
        return result;
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      if (pgPool && _isMysqlConnError(error)) {
        activateFailover();
        return withTransaction(callback);
      }
      throw error;
    }
  }

  const client = await pgPool.connect();
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
  if (_usePg()) {
    const result = await pgPool.query(sql, params);
    return result.rows;
  }

  if (DB_TYPE === "mysql") {
    try {
      const { sql: msql, params: mparams } = translateForMySQL(sql, params);
      const [rows] = await mysqlPool.query(msql, mparams);
      return postProcessRows(rows);
    } catch (error) {
      if (pgPool && _isMysqlConnError(error)) {
        activateFailover();
        const result = await pgPool.query(sql, params);
        return result.rows;
      }
      throw error;
    }
  }

  const result = await pgPool.query(sql, params);
  return result.rows;
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const insert = async (sql, params = []) => {
  if (_usePg()) {
    const result = await pgPool.query(sql, params);
    return result.rows[0]?.id ?? result.rows[0];
  }

  if (DB_TYPE === "mysql") {
    try {
      let execSql = sql;
      let execParams = Array.isArray(params) ? [...params] : [];
      const generatedId = uuidv4();

      if (!/INSERT\s+INTO\s+\w+\s*\(\s*id\s*[,)]/i.test(execSql)) {
        execSql = execSql.replace(
          /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(/i,
          (_, tbl, cols) => `INSERT INTO ${tbl} (id, ${cols}) VALUES (?,`,
        );
        execParams = [generatedId, ...execParams];
      }

      const { sql: msql, params: mparams } = translateForMySQL(
        execSql,
        execParams,
      );
      await mysqlPool.query(msql, mparams);
      return generatedId;
    } catch (error) {
      if (pgPool && _isMysqlConnError(error)) {
        activateFailover();
        const result = await pgPool.query(sql, params);
        return result.rows[0]?.id ?? result.rows[0];
      }
      throw error;
    }
  }

  const result = await pgPool.query(sql, params);
  return result.rows[0]?.id ?? result.rows[0];
};

const modify = async (sql, params = []) => {
  if (_usePg()) {
    const result = await pgPool.query(sql, params);
    return result.rowCount;
  }

  if (DB_TYPE === "mysql") {
    try {
      const { sql: msql, params: mparams } = translateForMySQL(sql, params);
      const [result] = await mysqlPool.query(msql, mparams);
      return result.affectedRows;
    } catch (error) {
      if (pgPool && _isMysqlConnError(error)) {
        activateFailover();
        const result = await pgPool.query(sql, params);
        return result.rowCount;
      }
      throw error;
    }
  }

  const result = await pgPool.query(sql, params);
  return result.rowCount;
};

module.exports = {
  pool,
  pgPool,
  mysqlPool,
  DB_TYPE,
  dbMonitor,
  testConnection,
  testMySQLConnection,
  withTransaction,
  query,
  queryOne,
  insert,
  modify,
  isFailedOver,
  activateFailover,
  deactivateFailover,
};

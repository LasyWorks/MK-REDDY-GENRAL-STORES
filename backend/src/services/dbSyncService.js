/**
 * dbSyncService.js — MySQL → Supabase (PostgreSQL) real-time sync & backup
 *
 * Architecture:
 *  - MySQL is the PRIMARY database (DB_TYPE=mysql)
 *  - Supabase/PostgreSQL is the BACKUP (always-on)
 *  - Periodic sync pushes all MySQL data → Supabase
 *  - A JSON backup file is written alongside for disaster recovery
 *
 * Sync strategy: UPSERT — for each table, fetch all rows from MySQL,
 *   then INSERT … ON CONFLICT DO UPDATE into Supabase.
 *   Deletes are handled by comparing IDs and removing stale rows in PG.
 */

"use strict";

const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// All tables in dependency order (parents before children)
const SYNC_TABLES = [
  "roles",
  "users",
  "otps",
  "refresh_tokens",
  "failed_login_attempts",
  "categories",
  "category_translations",
  "products",
  "product_translations",
  "promotions",
  "promotion_products",
  "carts",
  "cart_items",
  "orders",
  "order_items",
  "invoices",
  "admin_logs",
  "system_config",
  "store_settings",
  "linked_identities",
  "merge_sessions",
  "merge_otps",
  "merge_audit_log",
];

// Primary key column for each table (most use 'id', store_settings uses 'key')
const PK_MAP = {
  store_settings: "key",
};

function getPk(table) {
  return PK_MAP[table] || "id";
}

/**
 * Fetch all rows from a MySQL table.
 */
async function fetchMySQLTable(mysqlPool, table) {
  const [rows] = await mysqlPool.query(`SELECT * FROM \`${table}\``);
  return rows;
}

/**
 * Upsert rows into Supabase/PostgreSQL table.
 * Uses INSERT … ON CONFLICT (pk) DO UPDATE SET …
 */
async function upsertToPg(pgPool, table, rows) {
  if (!rows.length) return { upserted: 0, deleted: 0 };

  const pk = getPk(table);
  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const updateSet = columns
    .filter((c) => c !== pk)
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(", ");

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    let upserted = 0;
    // Batch upserts in chunks of 50
    const CHUNK = 50;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      for (const row of chunk) {
        const values = columns.map((c) => {
          const val = row[c];
          // Convert MySQL JSON objects to string for PG jsonb
          if (
            val !== null &&
            typeof val === "object" &&
            !(val instanceof Date)
          ) {
            return JSON.stringify(val);
          }
          // Convert MySQL tinyint booleans
          if (val === 0 || val === 1) {
            const boolCols = [
              "is_active",
              "is_blocked",
              "is_featured",
              "revoked",
              "is_verified",
              "is_paid",
              "email_sent",
              "sms_sent",
              "email_verified",
              "primary_otp_verified",
              "secondary_otp_verified",
            ];
            if (boolCols.includes(c)) return val === 1;
          }
          return val;
        });
        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");
        const sql = updateSet
          ? `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})
             ON CONFLICT ("${pk}") DO UPDATE SET ${updateSet}`
          : `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})
             ON CONFLICT ("${pk}") DO NOTHING`;
        await client.query(sql, values);
        upserted++;
      }
    }

    // Remove rows from PG that no longer exist in MySQL
    const mysqlIds = rows.map((r) => r[pk]);
    let deleted = 0;
    if (mysqlIds.length > 0) {
      const placeholders = mysqlIds.map((_, i) => `$${i + 1}`).join(", ");
      const delResult = await client.query(
        `DELETE FROM "${table}" WHERE "${pk}" NOT IN (${placeholders})`,
        mysqlIds,
      );
      deleted = delResult.rowCount || 0;
    }

    await client.query("COMMIT");
    return { upserted, deleted };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Full sync: MySQL → Supabase for all tables.
 * Returns a summary object.
 */
async function syncAll(mysqlPool, pgPool) {
  if (!mysqlPool || !pgPool) {
    throw new Error("Both MySQL and PostgreSQL pools are required for sync");
  }

  const startTime = Date.now();
  const summary = {
    tables: {},
    errors: [],
    startedAt: new Date().toISOString(),
  };

  // Disable FK checks during sync to avoid ordering issues
  const client = await pgPool.connect();
  try {
    await client.query("SET session_replication_role = 'replica'");
  } finally {
    client.release();
  }

  for (const table of SYNC_TABLES) {
    try {
      const rows = await fetchMySQLTable(mysqlPool, table);
      const result = await upsertToPg(pgPool, table, rows);
      summary.tables[table] = {
        rows: rows.length,
        upserted: result.upserted,
        deleted: result.deleted,
        status: "ok",
      };
    } catch (error) {
      logger.error(`Sync error for table "${table}": ${error.message}`);
      summary.tables[table] = { status: "error", error: error.message };
      summary.errors.push({ table, error: error.message });
    }
  }

  // Re-enable FK checks
  const client2 = await pgPool.connect();
  try {
    await client2.query("SET session_replication_role = 'origin'");
  } finally {
    client2.release();
  }

  summary.durationMs = Date.now() - startTime;
  summary.completedAt = new Date().toISOString();
  summary.tablesTotal = SYNC_TABLES.length;
  summary.tablesSynced = SYNC_TABLES.length - summary.errors.length;
  summary.tablesFailed = summary.errors.length;

  return summary;
}

/**
 * Sync a single table from MySQL → Supabase.
 */
async function syncTable(mysqlPool, pgPool, table) {
  if (!SYNC_TABLES.includes(table)) {
    throw new Error(`Unknown table: ${table}`);
  }
  const rows = await fetchMySQLTable(mysqlPool, table);
  return upsertToPg(pgPool, table, rows);
}

/**
 * Write a full JSON backup of all MySQL data to disk.
 * File: backend/backups/backup-<timestamp>.json
 */
async function writeBackupFile(mysqlPool) {
  if (!mysqlPool) throw new Error("MySQL pool is required for backup");

  const backupDir = path.resolve(__dirname, "../../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(backupDir, `backup-${timestamp}.json`);

  const data = { createdAt: new Date().toISOString(), tables: {} };

  for (const table of SYNC_TABLES) {
    try {
      const rows = await fetchMySQLTable(mysqlPool, table);
      data.tables[table] = { rowCount: rows.length, rows };
    } catch (error) {
      data.tables[table] = { rowCount: 0, rows: [], error: error.message };
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  logger.info(`Backup written: ${filePath}`);

  // Keep only last 10 backups
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
    .sort()
    .reverse();
  for (let i = 10; i < files.length; i++) {
    fs.unlinkSync(path.join(backupDir, files[i]));
  }

  return { filePath, tables: Object.keys(data.tables).length, timestamp };
}

/**
 * Restore from a backup JSON file → MySQL.
 * Caution: This truncates MySQL tables and replaces all data.
 */
async function restoreFromBackup(mysqlPool, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const conn = await mysqlPool.getConnection();
  const summary = { restored: {}, errors: [] };

  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.beginTransaction();

    for (const table of SYNC_TABLES) {
      const tableData = data.tables[table];
      if (!tableData || !tableData.rows || tableData.rows.length === 0) {
        summary.restored[table] = 0;
        continue;
      }

      await conn.query(`TRUNCATE TABLE \`${table}\``);

      const rows = tableData.rows;
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `\`${c}\``).join(", ");
      const placeholders = columns.map(() => "?").join(", ");

      for (const row of rows) {
        const values = columns.map((c) => {
          const val = row[c];
          if (
            val !== null &&
            typeof val === "object" &&
            !(val instanceof Date)
          ) {
            return JSON.stringify(val);
          }
          return val;
        });
        await conn.query(
          `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`,
          values,
        );
      }
      summary.restored[table] = rows.length;
    }

    await conn.commit();
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  } catch (error) {
    await conn.rollback();
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    throw error;
  } finally {
    conn.release();
  }

  return summary;
}

/**
 * Fetch all rows from a Supabase/PostgreSQL table.
 */
async function fetchPgTable(pgPool, table) {
  const client = await pgPool.connect();
  try {
    const result = await client.query(`SELECT * FROM "${table}"`);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Upsert rows from Supabase into MySQL.
 * Runs after MySQL recovers from a failover to catch up on writes made
 * to Supabase while MySQL was unreachable.
 */
async function upsertToMySQL(mysqlPool, table, rows) {
  if (!rows || !rows.length) return { upserted: 0 };

  const conn = await mysqlPool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.beginTransaction();

    const pk = getPk(table);
    const columns = Object.keys(rows[0]);
    const colList = columns.map((c) => `\`${c}\``).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const updateSet = columns
      .filter((c) => c !== pk)
      .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
      .join(", ");

    let upserted = 0;
    for (const row of rows) {
      const values = columns.map((c) => {
        const val = row[c];
        if (val !== null && typeof val === "object" && !(val instanceof Date)) {
          return JSON.stringify(val);
        }
        return val;
      });
      const sql = updateSet
        ? `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateSet}`
        : `INSERT IGNORE INTO \`${table}\` (${colList}) VALUES (${placeholders})`;
      await conn.query(sql, values);
      upserted++;
    }

    await conn.commit();
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    return { upserted };
  } catch (error) {
    await conn.rollback();
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Reverse sync: Supabase → MySQL.
 * Called automatically after MySQL recovers from failover so that any writes
 * made to Supabase during the outage are propagated back to MySQL.
 */
async function syncSupabaseToMySQL(pgPool, mysqlPool) {
  if (!pgPool || !mysqlPool) {
    throw new Error(
      "Both PostgreSQL and MySQL pools are required for reverse sync",
    );
  }

  const startTime = Date.now();
  const summary = {
    tables: {},
    errors: [],
    startedAt: new Date().toISOString(),
  };

  for (const table of SYNC_TABLES) {
    try {
      const rows = await fetchPgTable(pgPool, table);
      const result = await upsertToMySQL(mysqlPool, table, rows);
      summary.tables[table] = {
        rows: rows.length,
        upserted: result.upserted,
        status: "ok",
      };
    } catch (error) {
      logger.error(`Reverse sync error for table "${table}": ${error.message}`);
      summary.tables[table] = { status: "error", error: error.message };
      summary.errors.push({ table, error: error.message });
    }
  }

  summary.durationMs = Date.now() - startTime;
  summary.completedAt = new Date().toISOString();
  summary.tablesTotal = SYNC_TABLES.length;
  summary.tablesSynced = SYNC_TABLES.length - summary.errors.length;
  summary.tablesFailed = summary.errors.length;
  return summary;
}

module.exports = {
  SYNC_TABLES,
  syncAll,
  syncTable,
  syncSupabaseToMySQL,
  writeBackupFile,
  restoreFromBackup,
};

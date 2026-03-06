#!/usr/bin/env node
/**
 * sync-to-supabase.js — One-shot or scheduled sync from MySQL → Supabase
 *
 * Usage:
 *   node scripts/sync-to-supabase.js             # full sync + backup
 *   node scripts/sync-to-supabase.js --backup     # backup only (JSON file)
 *   node scripts/sync-to-supabase.js --restore <file>  # restore MySQL from backup
 *
 * Env vars required: MYSQL_*, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

"use strict";

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const {
  syncAll,
  writeBackupFile,
  restoreFromBackup,
} = require("../src/services/dbSyncService");

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "--sync";

  // Create MySQL pool
  const mysql = require("mysql2/promise");
  const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_NAME || "mk_kirana_stores",
    waitForConnections: true,
    connectionLimit: 3,
    charset: "utf8mb4",
  });

  // Create PG pool (Supabase)
  const { Pool } = require("pg");
  const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 3,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  try {
    if (mode === "--restore") {
      const file = args[1];
      if (!file) {
        console.error("Usage: sync-to-supabase.js --restore <backup-file>");
        process.exit(1);
      }
      console.log(`\n🔄 Restoring MySQL from backup: ${file}\n`);
      const result = await restoreFromBackup(mysqlPool, file);
      console.log("✅ Restore complete:");
      for (const [table, count] of Object.entries(result.restored)) {
        if (count > 0) console.log(`   ${table}: ${count} rows`);
      }
      return;
    }

    if (mode === "--backup") {
      console.log("\n📦 Writing backup file...\n");
      const result = await writeBackupFile(mysqlPool);
      console.log(`✅ Backup saved: ${result.filePath}`);
      console.log(`   Tables: ${result.tables}`);
      return;
    }

    // Default: full sync + backup
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  MySQL → Supabase Full Sync");
    console.log("═══════════════════════════════════════════════════════\n");

    // Step 1: Write backup
    console.log("📦 Step 1: Writing local JSON backup...");
    const backup = await writeBackupFile(mysqlPool);
    console.log(`   ✓ ${backup.filePath}\n`);

    // Step 2: Sync to Supabase
    console.log("🔄 Step 2: Syncing MySQL → Supabase...\n");
    const summary = await syncAll(mysqlPool, pgPool);

    for (const [table, info] of Object.entries(summary.tables)) {
      if (info.status === "ok") {
        const del = info.deleted > 0 ? ` (${info.deleted} stale removed)` : "";
        console.log(`   ✓ ${table}: ${info.rows} rows${del}`);
      } else {
        console.log(`   ✗ ${table}: ${info.error}`);
      }
    }

    console.log(`\n${"─".repeat(55)}`);
    console.log(
      `  Synced: ${summary.tablesSynced}/${summary.tablesTotal} tables`,
    );
    console.log(`  Duration: ${summary.durationMs}ms`);
    if (summary.tablesFailed > 0) {
      console.log(`  ⚠ Failed: ${summary.tablesFailed} table(s)`);
    }
    console.log(`${"─".repeat(55)}\n`);
  } finally {
    await mysqlPool.end();
    await pgPool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Sync failed:", err.message);
  process.exit(1);
});

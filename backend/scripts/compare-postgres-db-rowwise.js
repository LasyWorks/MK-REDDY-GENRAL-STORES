"use strict";

const { Client } = require("pg");

const toBool = (v, fallback = true) => {
  if (v === undefined || v === null || v === "") return fallback;
  return String(v).toLowerCase() === "true";
};

function getConfig(prefix, defaultSsl = true) {
  return {
    host: process.env[`${prefix}_DB_HOST`],
    port: Number(process.env[`${prefix}_DB_PORT`] || 5432),
    user: process.env[`${prefix}_DB_USER`],
    password: process.env[`${prefix}_DB_PASSWORD`],
    database: process.env[`${prefix}_DB_NAME`],
    ssl: toBool(process.env[`${prefix}_DB_SSL`], defaultSsl)
      ? { rejectUnauthorized: false }
      : false,
  };
}

function validateConfig(name, cfg) {
  const missing = ["host", "port", "user", "password", "database"].filter((k) => !cfg[k]);
  if (missing.length) {
    throw new Error(`${name} config missing: ${missing.join(", ")}`);
  }
}

function qid(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function fetchTables(client) {
  const { rows } = await client.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`
  );
  return rows.map((r) => r.tablename);
}

async function fetchColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((r) => r.column_name);
}

async function fetchRowRepresentations(client, table, columns) {
  const colSql = columns.map((c) => qid(c)).join(", ");
  const sql = `SELECT row_to_json(t)::text AS row_repr FROM (SELECT ${colSql} FROM ${qid(table)}) t ORDER BY row_repr`;
  const { rows } = await client.query(sql);
  return rows.map((r) => r.row_repr);
}

function diffSortedArrays(a, b) {
  let i = 0;
  let j = 0;
  const onlyA = [];
  const onlyB = [];

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (a[i] < b[j]) {
      onlyA.push(a[i]);
      i += 1;
    } else {
      onlyB.push(b[j]);
      j += 1;
    }
  }

  while (i < a.length) {
    onlyA.push(a[i]);
    i += 1;
  }

  while (j < b.length) {
    onlyB.push(b[j]);
    j += 1;
  }

  return { onlyA, onlyB };
}

async function main() {
  const src = getConfig("SRC", true);
  const tgt = getConfig("TGT", true);
  validateConfig("Source", src);
  validateConfig("Target", tgt);

  const srcClient = new Client(src);
  const tgtClient = new Client(tgt);

  try {
    await srcClient.connect();
    await tgtClient.connect();

    const [srcTables, tgtTables] = await Promise.all([fetchTables(srcClient), fetchTables(tgtClient)]);

    const srcSet = new Set(srcTables);
    const tgtSet = new Set(tgtTables);
    const onlySrcTables = srcTables.filter((t) => !tgtSet.has(t));
    const onlyTgtTables = tgtTables.filter((t) => !srcSet.has(t));

    if (onlySrcTables.length || onlyTgtTables.length) {
      console.log("Table list differs; row-wise compare skipped.");
      if (onlySrcTables.length) console.log(`Only in source: ${onlySrcTables.join(", ")}`);
      if (onlyTgtTables.length) console.log(`Only in target: ${onlyTgtTables.join(", ")}`);
      process.exit(2);
    }

    const tables = [...srcTables];
    const mismatches = [];

    console.log(`Comparing rows table-by-table (${tables.length} tables)...`);

    for (const table of tables) {
      const [srcCols, tgtCols] = await Promise.all([
        fetchColumns(srcClient, table),
        fetchColumns(tgtClient, table),
      ]);

      const srcColSig = srcCols.join("|");
      const tgtColSig = tgtCols.join("|");
      if (srcColSig !== tgtColSig) {
        mismatches.push({ table, reason: "column-order-or-list-diff" });
        console.log(`- ${table}: column signature differs`);
        continue;
      }

      const [srcRows, tgtRows] = await Promise.all([
        fetchRowRepresentations(srcClient, table, srcCols),
        fetchRowRepresentations(tgtClient, table, tgtCols),
      ]);

      const { onlyA, onlyB } = diffSortedArrays(srcRows, tgtRows);

      if (onlyA.length || onlyB.length) {
        mismatches.push({
          table,
          reason: "row-content-diff",
          onlySourceCount: onlyA.length,
          onlyTargetCount: onlyB.length,
          sampleOnlySource: onlyA.slice(0, 3),
          sampleOnlyTarget: onlyB.slice(0, 3),
        });
        console.log(`- ${table}: DIFF (onlySource=${onlyA.length}, onlyTarget=${onlyB.length})`);
      } else {
        console.log(`- ${table}: MATCH (${srcRows.length} rows)`);
      }
    }

    if (!mismatches.length) {
      console.log("\nROW-WISE RESULT: ALL TABLES MATCH EXACTLY");
      return;
    }

    console.log("\nROW-WISE RESULT: DIFFERENCES FOUND");
    for (const mm of mismatches) {
      console.log(`\nTable: ${mm.table}`);
      console.log(`Reason: ${mm.reason}`);
      if (mm.onlySourceCount !== undefined) {
        console.log(`Only in source count: ${mm.onlySourceCount}`);
        console.log(`Only in target count: ${mm.onlyTargetCount}`);
      }
      if (mm.sampleOnlySource && mm.sampleOnlySource.length) {
        console.log("Sample source-only rows:");
        mm.sampleOnlySource.forEach((r) => console.log(r));
      }
      if (mm.sampleOnlyTarget && mm.sampleOnlyTarget.length) {
        console.log("Sample target-only rows:");
        mm.sampleOnlyTarget.forEach((r) => console.log(r));
      }
    }

    process.exit(1);
  } finally {
    await srcClient.end().catch(() => {});
    await tgtClient.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("Row-wise comparison failed:", err.message);
  process.exit(1);
});

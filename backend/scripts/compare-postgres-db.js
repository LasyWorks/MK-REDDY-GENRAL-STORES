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

function mapBy(rows, key) {
  const out = new Map();
  for (const row of rows) out.set(row[key], row);
  return out;
}

function diffSet(label, srcArr, tgtArr, keyFn = (v) => v) {
  const src = new Set(srcArr.map(keyFn));
  const tgt = new Set(tgtArr.map(keyFn));
  const onlySrc = [...src].filter((k) => !tgt.has(k)).sort();
  const onlyTgt = [...tgt].filter((k) => !src.has(k)).sort();
  return { label, onlySrc, onlyTgt };
}

function normalizeConstraintDefinition(definition) {
  return String(definition)
    .replace(/::character varying::text/g, "::character varying")
    .replace(/\]::text\[\]/g, "]")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTables(client) {
  const { rows } = await client.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname='public'
     ORDER BY tablename`
  );
  return rows.map((r) => r.tablename);
}

async function fetchColumns(client) {
  const { rows } = await client.query(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public'
     ORDER BY table_name, ordinal_position`
  );
  return rows;
}

async function fetchConstraints(client) {
  const { rows } = await client.query(
    `SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      pg_get_constraintdef(c.oid, true) AS definition
     FROM information_schema.table_constraints tc
     JOIN pg_constraint c ON c.conname = tc.constraint_name
     JOIN pg_class cl ON cl.oid = c.conrelid
     JOIN pg_namespace ns ON ns.oid = cl.relnamespace AND ns.nspname='public'
     WHERE tc.table_schema='public'
     ORDER BY tc.table_name, tc.constraint_name`
  );
  return rows;
}

async function fetchIndexes(client) {
  const { rows } = await client.query(
    `SELECT tablename, indexname, indexdef
     FROM pg_indexes
     WHERE schemaname='public'
     ORDER BY tablename, indexname`
  );
  return rows;
}

async function fetchFunctions(client) {
  const { rows } = await client.query(
    `SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, pg_get_functiondef(p.oid) AS def
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public'
     ORDER BY p.proname, args`
  );
  return rows;
}

async function fetchExtensions(client) {
  const { rows } = await client.query(
    `SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY extname`
  );
  return rows.map((r) => r.extname);
}

async function fetchRowCounts(client, tables) {
  const out = [];
  for (const t of tables) {
    const q = `SELECT COUNT(*)::bigint AS count FROM "${t.replace(/"/g, '""')}"`;
    const { rows } = await client.query(q);
    out.push({ table: t, count: Number(rows[0].count) });
  }
  return out;
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printSetDiff(diff) {
  if (!diff.onlySrc.length && !diff.onlyTgt.length) {
    console.log(`${diff.label}: MATCH`);
    return;
  }
  console.log(`${diff.label}: DIFFERENT`);
  if (diff.onlySrc.length) console.log(`  Only in source (${diff.onlySrc.length}): ${diff.onlySrc.join(", ")}`);
  if (diff.onlyTgt.length) console.log(`  Only in target (${diff.onlyTgt.length}): ${diff.onlyTgt.join(", ")}`);
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

    const [srcTables, tgtTables] = await Promise.all([
      fetchTables(srcClient),
      fetchTables(tgtClient),
    ]);

    printSection("TABLES");
    printSetDiff(diffSet("Tables", srcTables, tgtTables));

    const commonTables = srcTables.filter((t) => tgtTables.includes(t)).sort();

    const [srcCounts, tgtCounts] = await Promise.all([
      fetchRowCounts(srcClient, commonTables),
      fetchRowCounts(tgtClient, commonTables),
    ]);
    const srcCountMap = mapBy(srcCounts, "table");
    const tgtCountMap = mapBy(tgtCounts, "table");

    const rowDiffs = [];
    for (const t of commonTables) {
      const a = srcCountMap.get(t).count;
      const b = tgtCountMap.get(t).count;
      if (a !== b) rowDiffs.push({ table: t, source: a, target: b, delta: b - a });
    }

    printSection("ROW COUNTS");
    if (!rowDiffs.length) {
      console.log("All common tables have identical row counts.");
    } else {
      for (const d of rowDiffs) {
        console.log(`${d.table}: source=${d.source}, target=${d.target}, delta=${d.delta}`);
      }
    }

    const [srcCols, tgtCols] = await Promise.all([
      fetchColumns(srcClient),
      fetchColumns(tgtClient),
    ]);
    const colKey = (r) => `${r.table_name}.${r.column_name}:${r.data_type}:${r.udt_name}:${r.is_nullable}:${r.column_default || ""}`;

    printSection("COLUMNS");
    printSetDiff(diffSet("Column signatures", srcCols, tgtCols, colKey));

    const [srcCons, tgtCons] = await Promise.all([
      fetchConstraints(srcClient),
      fetchConstraints(tgtClient),
    ]);
    const conKey = (r) => {
      const normalized =
        r.constraint_type === "CHECK"
          ? normalizeConstraintDefinition(r.definition)
          : String(r.definition).replace(/\s+/g, " ").trim();
      return `${r.table_name}.${r.constraint_name}:${r.constraint_type}:${normalized}`;
    };

    printSection("CONSTRAINTS");
    printSetDiff(diffSet("Constraint signatures", srcCons, tgtCons, conKey));

    const [srcIdx, tgtIdx] = await Promise.all([
      fetchIndexes(srcClient),
      fetchIndexes(tgtClient),
    ]);
    const idxKey = (r) => `${r.tablename}.${r.indexname}:${r.indexdef}`;

    printSection("INDEXES");
    printSetDiff(diffSet("Index signatures", srcIdx, tgtIdx, idxKey));

    const [srcFns, tgtFns] = await Promise.all([
      fetchFunctions(srcClient),
      fetchFunctions(tgtClient),
    ]);
    const fnKey = (r) => `${r.proname}(${r.args})`;

    printSection("FUNCTIONS");
    printSetDiff(diffSet("Function names/signatures", srcFns, tgtFns, fnKey));

    const [srcExt, tgtExt] = await Promise.all([
      fetchExtensions(srcClient),
      fetchExtensions(tgtClient),
    ]);

    printSection("EXTENSIONS");
    printSetDiff(diffSet("Extensions", srcExt, tgtExt));

    console.log("\nComparison complete.");
  } finally {
    await srcClient.end().catch(() => {});
    await tgtClient.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("Comparison failed:", err.message);
  process.exit(1);
});

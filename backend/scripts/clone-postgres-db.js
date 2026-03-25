"use strict";

/**
 * Clone full public schema + data from one PostgreSQL DB to another.
 *
 * Required env vars:
 * - SRC_DB_HOST, SRC_DB_PORT, SRC_DB_USER, SRC_DB_PASSWORD, SRC_DB_NAME
 * - TGT_DB_HOST, TGT_DB_PORT, TGT_DB_USER, TGT_DB_PASSWORD, TGT_DB_NAME
 *
 * Optional env vars:
 * - SRC_DB_SSL=true|false (default true)
 * - TGT_DB_SSL=true|false (default true)
 */

const { Client } = require("pg");
const { types } = require("pg");

// Keep temporal values as raw strings to avoid microsecond truncation in JS Date parsing.
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
types.setTypeParser(1083, (v) => v); // time
types.setTypeParser(1266, (v) => v); // timetz

const toBool = (v, fallback = true) => {
  if (v === undefined || v === null || v === "") return fallback;
  return String(v).toLowerCase() === "true";
};

const qid = (name) => `"${String(name).replace(/"/g, '""')}"`;

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

async function getPublicTables(client) {
  const { rows } = await client.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`
  );
  return rows.map((r) => r.tablename);
}

async function getExtensions(client) {
  const { rows } = await client.query(
    `SELECT extname
     FROM pg_extension
     WHERE extname NOT IN ('plpgsql')
     ORDER BY extname`
  );
  return rows.map((r) => r.extname);
}

async function getFunctions(client) {
  const { rows } = await client.query(
    `SELECT p.oid, pg_get_functiondef(p.oid) AS fn_def
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     LEFT JOIN pg_depend d
       ON d.classid = 'pg_proc'::regclass
      AND d.objid = p.oid
      AND d.deptype = 'e'
     WHERE n.nspname = 'public'
       AND d.objid IS NULL
     ORDER BY p.proname, p.oid`
  );
  return rows.map((r) => r.fn_def);
}

async function getColumns(client, table) {
  const { rows } = await client.query(
    `SELECT
      a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
      NOT a.attnotnull AS is_nullable,
      pg_get_expr(ad.adbin, ad.adrelid) AS column_default
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE n.nspname = 'public'
       AND c.relname = $1
       AND a.attnum > 0
       AND NOT a.attisdropped
     ORDER BY a.attnum`,
    [table]
  );
  return rows;
}

async function getConstraints(client) {
  const { rows } = await client.query(
    `SELECT
      c.relname AS table_name,
      con.conname,
      con.contype,
      pg_get_constraintdef(con.oid, true) AS con_def,
      conf.relname AS referenced_table
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_class conf ON conf.oid = con.confrelid
     WHERE n.nspname = 'public'
       AND con.contype IN ('p','u','f','c')
     ORDER BY c.relname, con.contype, con.conname`
  );
  return rows;
}

async function getIndexes(client, table) {
  const { rows } = await client.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1
     ORDER BY indexname`,
    [table]
  );
  return rows;
}

async function getTriggers(client) {
  const { rows } = await client.query(
    `SELECT
      c.relname AS table_name,
      t.tgname,
      pg_get_triggerdef(t.oid, true) AS trigger_def
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND NOT t.tgisinternal
     ORDER BY c.relname, t.tgname`
  );
  return rows;
}

function topoSortTables(tables, fkConstraints) {
  const deps = new Map();
  const reverse = new Map();

  for (const t of tables) {
    deps.set(t, new Set());
    reverse.set(t, new Set());
  }

  for (const c of fkConstraints) {
    if (!c.referenced_table) continue;
    if (!deps.has(c.table_name) || !deps.has(c.referenced_table)) continue;
    deps.get(c.table_name).add(c.referenced_table);
    reverse.get(c.referenced_table).add(c.table_name);
  }

  const queue = tables.filter((t) => deps.get(t).size === 0).sort();
  const result = [];

  while (queue.length) {
    const table = queue.shift();
    result.push(table);

    for (const child of reverse.get(table)) {
      const childDeps = deps.get(child);
      childDeps.delete(table);
      if (childDeps.size === 0) {
        queue.push(child);
      }
    }

    queue.sort();
  }

  if (result.length !== tables.length) {
    const seen = new Set(result);
    const remaining = tables.filter((t) => !seen.has(t)).sort();
    return [...result, ...remaining];
  }

  return result;
}

async function createSchema(source, target) {
  console.log("\n[1/5] Creating extensions...");
  const extensions = await getExtensions(source);
  for (const ext of extensions) {
    await target.query(`CREATE EXTENSION IF NOT EXISTS ${qid(ext)}`);
  }
  console.log(`  Extensions ensured: ${extensions.length}`);

  console.log("\n[2/5] Creating functions...");
  const functions = await getFunctions(source);
  for (const fn of functions) {
    await target.query(fn);
  }
  console.log(`  Functions created/updated: ${functions.length}`);

  const tables = await getPublicTables(source);
  console.log("\n[3/5] Creating tables...");
  for (const table of tables) {
    const cols = await getColumns(source, table);
    const colSql = cols
      .map((c) => {
        const nullable = c.is_nullable ? "" : " NOT NULL";
        const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
        return `${qid(c.column_name)} ${c.data_type}${def}${nullable}`;
      })
      .join(",\n  ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${qid(table)} (\n  ${colSql}\n)`;
    await target.query(createSql);
  }
  console.log(`  Tables created: ${tables.length}`);

  const constraints = await getConstraints(source);
  console.log("\n[4/5] Adding constraints...");

  const nonFk = constraints.filter((c) => c.contype !== "f");
  const fks = constraints.filter((c) => c.contype === "f");

  for (const c of nonFk) {
    const sql = `ALTER TABLE ${qid(c.table_name)} ADD CONSTRAINT ${qid(c.conname)} ${c.con_def}`;
    await target.query(sql);
  }

  for (const c of fks) {
    const sql = `ALTER TABLE ${qid(c.table_name)} ADD CONSTRAINT ${qid(c.conname)} ${c.con_def}`;
    await target.query(sql);
  }
  console.log(`  Constraints created: ${constraints.length}`);

  console.log("\n[5/5] Creating indexes and triggers...");
  for (const table of tables) {
    const indexes = await getIndexes(source, table);
    for (const idx of indexes) {
      const withIfNotExists = idx.indexdef.replace(
        /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i,
        (m, uniquePart) => `CREATE ${uniquePart || ""}INDEX IF NOT EXISTS `
      );
      await target.query(withIfNotExists);
    }
  }

  const triggers = await getTriggers(source);
  for (const trg of triggers) {
    await target.query(trg.trigger_def);
  }

  console.log("  Indexes and triggers created");

  return { tables, constraints };
}

async function copyData(source, target, tables, fkConstraints) {
  const order = topoSortTables(tables, fkConstraints.filter((c) => c.contype === "f"));

  console.log("\n[Data] Copying rows table-by-table...");

  const copyTable = async (table) => {
    const result = await source.query(`SELECT * FROM ${qid(table)}`);
    const rows = result.rows;

    if (!rows.length) {
      console.log(`  ${table}: 0 rows`);
      return true;
    }

    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => qid(c)).join(", ");
    const chunkSize = 500;
    let inserted = 0;

    await target.query("BEGIN");
    try {
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const values = [];
        const tuples = chunk
          .map((row, rowIdx) => {
            const placeholders = cols
              .map((col, colIdx) => {
                values.push(row[col]);
                return `$${rowIdx * cols.length + colIdx + 1}`;
              })
              .join(", ");
            return `(${placeholders})`;
          })
          .join(", ");

        const sql = `INSERT INTO ${qid(table)} (${colList}) VALUES ${tuples}`;
        await target.query(sql, values);
        inserted += chunk.length;
      }
      await target.query("COMMIT");
      console.log(`  ${table}: ${inserted} rows`);
      return true;
    } catch (error) {
      await target.query("ROLLBACK");
      if (error && error.code === "23503") {
        return false;
      }
      throw error;
    }
  };

  const pending = [...order];
  let rounds = 0;

  while (pending.length) {
    rounds += 1;
    let progressed = false;

    for (let i = 0; i < pending.length; ) {
      const table = pending[i];
      const done = await copyTable(table);
      if (done) {
        pending.splice(i, 1);
        progressed = true;
      } else {
        i += 1;
      }
    }

    if (!progressed) {
      throw new Error(
        `Could not resolve FK dependencies after ${rounds} rounds. Pending tables: ${pending.join(", ")}`
      );
    }
  }
}

async function main() {
  const srcConfig = getConfig("SRC", true);
  const tgtConfig = getConfig("TGT", true);

  validateConfig("Source", srcConfig);
  validateConfig("Target", tgtConfig);

  const source = new Client(srcConfig);
  const target = new Client(tgtConfig);

  try {
    console.log("Connecting to source and target...");
    await source.connect();
    await target.connect();

    const resetTarget = toBool(process.env.TGT_RESET_PUBLIC, false);
    const targetTables = await getPublicTables(target);

    if (targetTables.length > 0 && resetTarget) {
      console.log("Target has existing tables. Resetting public schema...");
      await target.query("DROP SCHEMA IF EXISTS public CASCADE");
      await target.query("CREATE SCHEMA public");
      await target.query("GRANT ALL ON SCHEMA public TO postgres");
      await target.query("GRANT ALL ON SCHEMA public TO public");
    } else if (targetTables.length > 0) {
      throw new Error(
        `Target DB is not empty (${targetTables.length} tables found). Set TGT_RESET_PUBLIC=true to replace it.`
      );
    }

    const { tables, constraints } = await createSchema(source, target);
    await copyData(source, target, tables, constraints);

    console.log("\nClone completed successfully.");
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("Clone failed:", err.message);
  process.exit(1);
});

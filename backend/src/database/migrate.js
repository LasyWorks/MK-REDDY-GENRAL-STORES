const { Client } = require('pg');
const fs2 = require('fs');
const path = require('path');
require('dotenv').config();
const DB_NAME = process.env.DB_NAME || 'mk_kirana_stores';
const runMigration = async () => {
  let adminClient;
  let dbClient;
  try {
    console.log('Starting database migration...');
    const connBase = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };
    adminClient = new Client({ ...connBase, database: 'postgres' });
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');
    await adminClient.query('DROP DATABASE IF EXISTS "' + DB_NAME + '"');
    await adminClient.query(`CREATE DATABASE "${DB_NAME}" ENCODING 'UTF8'`);
    console.log('Database "' + DB_NAME + '" created');
    await adminClient.end();
    dbClient = new Client({ ...connBase, database: DB_NAME });
    await dbClient.connect();
    const schema = fs2.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await dbClient.query(schema);
    console.log('Schema executed successfully');
    const result = await dbClient.query(
      `SELECT tablename AS table_name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    console.log('Tables created:');
    result.rows.forEach(r => console.log('  -', r.table_name));
    console.log('Migration completed! DB:', DB_NAME);
    await dbClient.end();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};
if (require.main === module) runMigration();
module.exports = runMigration;
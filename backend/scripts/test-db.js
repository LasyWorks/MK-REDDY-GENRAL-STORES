const config = require('../src/config');
const { testConnection, pool } = require('../src/config/database');

async function main() {
  try {
    console.log('Using DB config:', {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      database: config.database.name,
    });

    await testConnection();
    console.log('✅ Database connection OK');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (e) {}
  }
}

main();

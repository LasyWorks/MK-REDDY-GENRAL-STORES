const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const runMigration = async () => {
  let connection;

  try {
    console.log('🔄 Starting database migration...');
    console.log(`📍 Connecting to MySQL at ${config.host}:${config.port}`);

    // Connect to MySQL without database
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Schema file loaded');

    // Execute schema
    console.log('🔄 Executing schema...');
    await connection.query(schema);
    console.log('✅ Schema executed successfully');

    // Verify tables created
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'mk_kirrana_stores'
      ORDER BY TABLE_NAME
    `);

    console.log('\n📋 Tables created:');
    tables.forEach((table) => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('📌 Database: mk_kirrana_stores');
    console.log('📌 Default admin user created:');
    console.log('   - Phone: 9999999999');
    console.log('   - Email: admin@mkkirrana.com');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Database connection closed');
    }
  }
};

// Run migration if executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

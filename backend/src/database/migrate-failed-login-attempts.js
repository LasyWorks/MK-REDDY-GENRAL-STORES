/**
 * Database migration to add failed_login_attempts table for account lockout feature
 * Run this migration to add brute force protection to existing databases
 * 
 * Usage: node backend/src/database/migrate-failed-login-attempts.js
 */

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting failed_login_attempts table migration...');
    
    // Check if table already exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'failed_login_attempts'
      );
    `;
    
    const { rows } = await client.query(checkTableQuery);
    
    if (rows[0].exists) {
      console.log('✓ Table failed_login_attempts already exists. Skipping migration.');
      return;
    }
    
    // Create table
    const createTableQuery = `
      CREATE TABLE failed_login_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
        phone VARCHAR(15) NOT NULL,
        ip_address VARCHAR(45),
        attempts INT DEFAULT 1,
        locked_until TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✓ Created table: failed_login_attempts');
    
    // Create indexes
    await client.query('CREATE INDEX idx_failed_login_phone ON failed_login_attempts(phone);');
    console.log('✓ Created index: idx_failed_login_phone');
    
    await client.query('CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address);');
    console.log('✓ Created index: idx_failed_login_ip');
    
    await client.query('CREATE INDEX idx_failed_login_locked ON failed_login_attempts(locked_until);');
    console.log('✓ Created index: idx_failed_login_locked');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('Account lockout feature is now enabled.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});

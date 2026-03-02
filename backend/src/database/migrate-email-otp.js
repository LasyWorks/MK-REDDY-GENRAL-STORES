const { query, modify } = require('../config/database');
const logger = require('../utils/logger');

async function migrateEmailOTP() {
  try {
    logger.info('Starting OTP table migration for email support...');

    // Check if email column already exists
    const columnCheck = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'otps' AND column_name = 'email'`
    );

    if (columnCheck.length > 0) {
      logger.info('Email column already exists in otps table');
      return;
    }

    // Add email column to otps table
    await modify(
      `ALTER TABLE otps 
       ADD COLUMN email VARCHAR(255),
       ADD CONSTRAINT otps_identifier_check CHECK (
         (phone IS NOT NULL AND email IS NULL) OR 
         (phone IS NULL AND email IS NOT NULL)
       )`
    );

    logger.info('✅ Added email column to otps table');

    // Make phone column nullable since we now support email-based OTPs
    await modify('ALTER TABLE otps ALTER COLUMN phone DROP NOT NULL');
    
    logger.info('✅ Made phone column nullable');

    // Create index on email for faster lookups
    await modify('CREATE INDEX idx_otps_email ON otps(email) WHERE email IS NOT NULL');
    
    logger.info('✅ Created index on email column');

    logger.info('Migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateEmailOTP()
    .then(() => {
      logger.info('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateEmailOTP;

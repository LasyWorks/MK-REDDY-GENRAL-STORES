const { query } = require('../config/database');
const logger = require('../utils/logger');

async function ensureBirthdayCampaignSchema() {
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_phone VARCHAR(15)`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_email VARCHAR(100)`);

  // Free unique phone/email/google_id for already soft-deleted users so new signups can reuse them.
  await query(`
    UPDATE users
    SET
      deleted_phone = COALESCE(deleted_phone, phone),
      deleted_email = COALESCE(deleted_email, email),
      phone = ('D' || substring(replace(id::text, '-', '') from 1 for 14)),
      email = CASE
        WHEN email IS NULL THEN NULL
        ELSE ('deleted+' || substring(replace(id::text, '-', '') from 1 for 20) || '@del.local')
      END,
      google_id = NULL
    WHERE deleted_at IS NOT NULL
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS birthday_campaign_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_year INTEGER NOT NULL,
      stage VARCHAR(30) NOT NULL CHECK (stage IN ('month_start', 'week_before', 'birthday_day')),
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB,
      UNIQUE (user_id, campaign_year, stage)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_birthday_logs_user ON birthday_campaign_logs(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_birthday_logs_year_stage ON birthday_campaign_logs(campaign_year, stage)`);

  await query(`
    CREATE TABLE IF NOT EXISTS birthday_offer_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      name VARCHAR(120) NOT NULL UNIQUE,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
      discount_value DECIMAL(10,2) NOT NULL,
      valid_days INTEGER NOT NULL DEFAULT 7,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_bday_tpl_active ON birthday_offer_templates(is_active)`);

  await query(`
    CREATE TABLE IF NOT EXISTS birthday_user_offers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_year INTEGER NOT NULL,
      birthday_date DATE NOT NULL,
      offer_template_id UUID REFERENCES birthday_offer_templates(id) ON DELETE SET NULL,
      discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'flat')),
      discount_value DECIMAL(10,2),
      valid_days INTEGER,
      coupon_code VARCHAR(40) UNIQUE,
      valid_from DATE,
      valid_until DATE,
      status VARCHAR(30) NOT NULL DEFAULT 'pending_selection' CHECK (status IN ('pending_selection','selected','ready_hidden','revealed','claimed','expired')),
      admin_selected_by UUID REFERENCES users(id) ON DELETE SET NULL,
      selected_at TIMESTAMPTZ,
      reveal_at TIMESTAMPTZ,
      claimed_at TIMESTAMPTZ,
      claimed_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, campaign_year)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_bday_user_offers_user ON birthday_user_offers(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bday_user_offers_bday ON birthday_user_offers(birthday_date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bday_user_offers_status ON birthday_user_offers(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bday_user_offers_code ON birthday_user_offers(coupon_code)`);

  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS birthday_offer_id UUID`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS birthday_coupon_code VARCHAR(40)`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS birthday_discount DECIMAL(12,2) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS birthday_offer_title VARCHAR(200)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_birthday_offer ON orders(birthday_offer_id)`);

  await query(`ALTER TABLE admin_notifications ALTER COLUMN type TYPE VARCHAR(50)`).catch(() => {});

  await query(`
    DO $$ BEGIN
      ALTER TABLE orders
      ADD CONSTRAINT fk_orders_birthday_offer
      FOREIGN KEY (birthday_offer_id) REFERENCES birthday_user_offers(id) ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  const templates = [
    ['Classic 10%', 'Standard birthday reward for all customers', 'percentage', 10, 7],
    ['Festive 15%', 'Mid-tier celebratory discount', 'percentage', 15, 7],
    ['Premium 20%', 'Premium segment birthday discount', 'percentage', 20, 5],
    ['Flat ₹150', 'Flat value birthday reward', 'flat', 150, 7],
  ];

  for (const [name, description, discountType, discountValue, validDays] of templates) {
    await query(
      `INSERT INTO birthday_offer_templates (name, description, discount_type, discount_value, valid_days)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO NOTHING`,
      [name, description, discountType, discountValue, validDays],
    );
  }

  const defaults = [
    ['birthday_campaign_enabled', '1', 'Birthday Campaign Enabled', 'Enable or disable automated birthday emails.'],
    ['birthday_discount_percent', '10', 'Birthday Discount Percent', 'Default birthday offer discount percentage.'],
    ['birthday_discount_code', 'BIRTHDAY10', 'Birthday Discount Code', 'Coupon code included in birthday campaign emails.'],
    ['birthday_discount_valid_days', '7', 'Birthday Discount Validity (days)', 'Number of days birthday discount remains valid after issue.'],
    ['birthday_offer_title', 'Birthday Special Offer', 'Birthday Offer Title', 'Heading text shown in birthday campaign emails.'],
  ];

  for (const [key, value, label, description] of defaults) {
    await query(
      `INSERT INTO store_settings (key, value, label, description, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [key, value, label, description],
    );
  }
}

async function runBootstrapMigrations() {
  try {
    await ensureBirthdayCampaignSchema();
    logger.info('[bootstrap-migrations] Birthday campaign schema ensured');
  } catch (error) {
    logger.error('[bootstrap-migrations] Failed to ensure schema:', error);
    throw error;
  }
}

module.exports = {
  runBootstrapMigrations,
};

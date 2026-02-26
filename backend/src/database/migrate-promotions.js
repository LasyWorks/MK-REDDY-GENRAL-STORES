const { Client } = require('pg');
require('dotenv').config();
const run = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mk_kirana_stores',
  });
  await client.connect();
  console.log('Connected – running promotions migration…');
  await client.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      type VARCHAR(30) NOT NULL DEFAULT 'limited_time'
        CHECK (type IN ('flash_sale','limited_time','festival','seasonal','recurring')),
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage'
        CHECK (discount_type IN ('percentage','flat')),
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      banner_image_url VARCHAR(500),
      banner_text VARCHAR(300),
      theme_color VARCHAR(30) DEFAULT '#FF6B00',
      badge_text VARCHAR(50) DEFAULT 'LIMITED OFFER',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      priority INT DEFAULT 0,
      recurrence_rule VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ promotions table');
  await client.query(`
    CREATE TABLE IF NOT EXISTS promotion_products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      custom_discount_value DECIMAL(10,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (promotion_id, product_id)
    );
  `);
  console.log('✓ promotion_products table');
  await client.query(`CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(starts_at, ends_at);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_promo_products_promo ON promotion_products(promotion_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_promo_products_product ON promotion_products(product_id);`);
  console.log('✓ indexes');
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_promotions') THEN
        CREATE TRIGGER set_updated_at_promotions
          BEFORE UPDATE ON promotions
          FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
      END IF;
    END $$;
  `);
  console.log('✓ trigger');
  await client.end();
  console.log('Promotions migration complete ✓');
};
run().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
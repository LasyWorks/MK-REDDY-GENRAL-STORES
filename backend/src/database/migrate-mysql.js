/**
 * migrate-mysql.js
 *
 * Creates the full MK Kirana Stores schema in MySQL 8+.
 *
 * Usage:
 *   node src/database/migrate-mysql.js
 *
 * Requires these env vars (see .env):
 *   MYSQL_HOST  MYSQL_PORT  MYSQL_USER  MYSQL_PASSWORD  MYSQL_NAME
 *
 * Design:
 *  - Phase 1: CREATE TABLE (PKs + indexes only, NO inline foreign keys)
 *  - Phase 2: ALTER TABLE ADD CONSTRAINT for every FK (after all tables exist)
 *  - All tables use CHAR(36) UUIDs; app layer supplies them via the uuid package.
 *  - utf8mb4 / utf8mb4_unicode_ci throughout (matches Supabase schema exactly).
 *  - Safe to re-run: CREATE TABLE IF NOT EXISTS + duplicate-key FK skip.
 *  - Supabase/PostgreSQL credentials are NOT touched.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const MYSQL_DB = process.env.MYSQL_NAME || 'mk_kirana_stores';

// ─── helpers ────────────────────────────────────────────────────────────────

async function adminConn() {
  return mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    charset:  'utf8mb4',
  });
}

async function dbConn(db) {
  return mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: db,
    charset:  'utf8mb4',
  });
}

async function createTable(c, sql, name) {
  await c.query(sql);
  console.log(`  ✓ ${name}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n=== MK Kirana Stores — MySQL Migration ===');
  console.log(`Target : ${MYSQL_DB}`);

  // ━━━ Step 1: Create database ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const admin = await adminConn();
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(`\n✓ Database '${MYSQL_DB}' ready.`);
  await admin.end();

  const c = await dbConn(MYSQL_DB);
  console.log('Connected.\n');

  // ━━━ Step 2: Create tables (NO inline foreign keys) ━━━━━━━━━━━━━━━━━━━━━
  console.log('── Phase 1: Creating tables ──────────────────────────────────');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`roles\` (
      \`id\`          CHAR(36)     NOT NULL,
      \`name\`        VARCHAR(50)  NOT NULL,
      \`description\` VARCHAR(255),
      \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`roles_name_unique\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'roles');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\`                    CHAR(36)     NOT NULL,
      \`role_id\`               CHAR(36)     NOT NULL,
      \`name\`                  VARCHAR(100) NOT NULL,
      \`phone\`                 VARCHAR(15)  NOT NULL,
      \`email\`                 VARCHAR(100),
      \`password_hash\`         VARCHAR(255),
      \`user_type\`             VARCHAR(20)  NOT NULL DEFAULT 'retail',
      \`address\`               TEXT,
      \`is_active\`             TINYINT(1)   NOT NULL DEFAULT 1,
      \`is_blocked\`            TINYINT(1)   NOT NULL DEFAULT 0,
      \`blocked_reason\`        VARCHAR(255),
      \`google_id\`             VARCHAR(255),
      \`profile_picture\`       TEXT,
      \`email_verified\`        TINYINT(1)   NOT NULL DEFAULT 0,
      \`deleted_at\`            DATETIME,
      \`last_login_at\`         DATETIME,
      \`failed_login_attempts\` INT          NOT NULL DEFAULT 0,
      \`locked_until\`          DATETIME,
      \`created_at\`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`users_phone_unique\`     (\`phone\`),
      UNIQUE KEY \`users_email_unique\`     (\`email\`),
      UNIQUE KEY \`users_google_id_unique\` (\`google_id\`),
      KEY \`idx_users_role\`   (\`role_id\`),
      KEY \`idx_users_active\` (\`is_active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'users');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`otps\` (
      \`id\`          CHAR(36)     NOT NULL,
      \`phone\`       VARCHAR(15),
      \`email\`       VARCHAR(255),
      \`otp_hash\`    VARCHAR(64)  NOT NULL,
      \`purpose\`     VARCHAR(20)  NOT NULL DEFAULT 'login',
      \`attempts\`    INT          NOT NULL DEFAULT 0,
      \`is_verified\` TINYINT(1)   NOT NULL DEFAULT 0,
      \`expires_at\`  DATETIME     NOT NULL,
      \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_otps_phone\`   (\`phone\`),
      KEY \`idx_otps_email\`   (\`email\`),
      KEY \`idx_otps_expires\` (\`expires_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'otps');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`refresh_tokens\` (
      \`id\`          CHAR(36)     NOT NULL,
      \`user_id\`     CHAR(36)     NOT NULL,
      \`token\`       TEXT         NOT NULL,
      \`device_info\` VARCHAR(255),
      \`ip_address\`  VARCHAR(45),
      \`expires_at\`  DATETIME     NOT NULL,
      \`revoked\`     TINYINT(1)   NOT NULL DEFAULT 0,
      \`revoked_at\`  DATETIME,
      \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_refresh_tokens_user\`    (\`user_id\`),
      KEY \`idx_refresh_tokens_expires\` (\`expires_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'refresh_tokens');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`failed_login_attempts\` (
      \`id\`              CHAR(36)    NOT NULL,
      \`phone\`           VARCHAR(15) NOT NULL,
      \`ip_address\`      VARCHAR(45),
      \`attempts\`        INT         NOT NULL DEFAULT 1,
      \`locked_until\`    DATETIME,
      \`last_attempt_at\` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`created_at\`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_failed_login_phone\`  (\`phone\`),
      KEY \`idx_failed_login_ip\`     (\`ip_address\`),
      KEY \`idx_failed_login_locked\` (\`locked_until\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'failed_login_attempts');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`categories\` (
      \`id\`            CHAR(36)   NOT NULL,
      \`parent_id\`     CHAR(36),
      \`image_url\`     VARCHAR(500),
      \`display_order\` INT        NOT NULL DEFAULT 0,
      \`is_active\`     TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_categories_active\` (\`is_active\`),
      KEY \`idx_categories_parent\` (\`parent_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'categories');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`category_translations\` (
      \`id\`          CHAR(36)     NOT NULL,
      \`category_id\` CHAR(36)     NOT NULL,
      \`lang_code\`   VARCHAR(5)   NOT NULL,
      \`name\`        VARCHAR(200) NOT NULL,
      \`description\` TEXT,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_cat_trans\`         (\`category_id\`, \`lang_code\`),
      KEY \`idx_cat_trans_category\` (\`category_id\`),
      KEY \`idx_cat_trans_lang\`     (\`lang_code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'category_translations');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\`                 CHAR(36)      NOT NULL,
      \`category_id\`        CHAR(36)      NOT NULL,
      \`sku\`                VARCHAR(50),
      \`brand\`              VARCHAR(100),
      \`variant\`            VARCHAR(100),
      \`unit_type\`          VARCHAR(50),
      \`unit_pack_size\`     VARCHAR(100),
      \`hsn_code\`           VARCHAR(20),
      \`mrp\`                DECIMAL(10,2),
      \`purchase_price\`     DECIMAL(10,2),
      \`price\`              DECIMAL(10,2) NOT NULL,
      \`wholesale_price\`    DECIMAL(10,2),
      \`gst_percentage\`     DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
      \`discount\`           DECIMAL(5,2),
      \`margin\`             DECIMAL(5,2),
      \`stock_quantity\`     INT           NOT NULL DEFAULT 0,
      \`min_order_quantity\` INT           NOT NULL DEFAULT 1,
      \`max_order_quantity\` INT,
      \`image_url\`          VARCHAR(500),
      \`is_active\`          TINYINT(1)    NOT NULL DEFAULT 1,
      \`is_featured\`        TINYINT(1)    NOT NULL DEFAULT 0,
      \`parent_product_id\`  CHAR(36),
      \`created_at\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`products_sku_unique\`  (\`sku\`),
      KEY \`idx_products_category\` (\`category_id\`),
      KEY \`idx_products_active\`   (\`is_active\`),
      KEY \`idx_products_featured\` (\`is_featured\`),
      KEY \`idx_products_price\`    (\`price\`),
      KEY \`idx_products_stock\`    (\`stock_quantity\`),
      KEY \`idx_products_brand\`    (\`brand\`),
      KEY \`idx_products_parent\`   (\`parent_product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'products');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`product_translations\` (
      \`id\`          CHAR(36)     NOT NULL,
      \`product_id\`  CHAR(36)     NOT NULL,
      \`lang_code\`   VARCHAR(5)   NOT NULL,
      \`name\`        VARCHAR(400) NOT NULL,
      \`description\` TEXT,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_prod_trans\`        (\`product_id\`, \`lang_code\`),
      KEY \`idx_prod_trans_product\` (\`product_id\`),
      KEY \`idx_prod_trans_lang\`    (\`lang_code\`),
      FULLTEXT KEY \`ft_prod_trans_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'product_translations');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`promotions\` (
      \`id\`               CHAR(36)      NOT NULL,
      \`title\`            VARCHAR(200)  NOT NULL,
      \`description\`      TEXT,
      \`type\`             VARCHAR(30)   NOT NULL DEFAULT 'limited_time',
      \`discount_type\`    VARCHAR(20)   NOT NULL DEFAULT 'percentage',
      \`discount_value\`   DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`banner_image_url\` VARCHAR(500),
      \`banner_text\`      VARCHAR(300),
      \`theme_color\`      VARCHAR(30)   DEFAULT '#FF6B00',
      \`badge_text\`       VARCHAR(50)   DEFAULT 'LIMITED OFFER',
      \`min_order_amount\` DECIMAL(12,2),
      \`reward_type\`      VARCHAR(20),
      \`free_product_id\`  CHAR(36),
      \`starts_at\`        DATETIME NOT NULL,
      \`ends_at\`          DATETIME NOT NULL,
      \`is_active\`        TINYINT(1)    NOT NULL DEFAULT 1,
      \`priority\`         INT           NOT NULL DEFAULT 0,
      \`recurrence_rule\`  VARCHAR(100),
      \`created_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_promotions_active\` (\`is_active\`),
      KEY \`idx_promotions_dates\`  (\`starts_at\`, \`ends_at\`),
      KEY \`idx_promotions_type\`   (\`type\`),
      KEY \`idx_promotions_free\`   (\`free_product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'promotions');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`promotion_products\` (
      \`id\`                    CHAR(36)      NOT NULL,
      \`promotion_id\`          CHAR(36)      NOT NULL,
      \`product_id\`            CHAR(36)      NOT NULL,
      \`custom_discount_value\` DECIMAL(10,2),
      \`deal_limit\`            INT,
      \`deals_claimed\`         INT NOT NULL DEFAULT 0,
      \`item_limit\`            INT,
      \`items_claimed\`         INT NOT NULL DEFAULT 0,
      \`created_at\`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_promo_product\`           (\`promotion_id\`, \`product_id\`),
      KEY \`idx_promo_products_promo\`   (\`promotion_id\`),
      KEY \`idx_promo_products_product\` (\`product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'promotion_products');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`carts\` (
      \`id\`         CHAR(36) NOT NULL,
      \`user_id\`    CHAR(36) NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`carts_user_unique\` (\`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'carts');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`cart_items\` (
      \`id\`         CHAR(36)      NOT NULL,
      \`cart_id\`    CHAR(36)      NOT NULL,
      \`product_id\` CHAR(36)      NOT NULL,
      \`quantity\`   INT           NOT NULL DEFAULT 1,
      \`unit_price\` DECIMAL(10,2) NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_cart_product\`           (\`cart_id\`, \`product_id\`),
      KEY \`idx_cart_items_cart\`    (\`cart_id\`),
      KEY \`idx_cart_items_product\` (\`product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'cart_items');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\`                  CHAR(36)      NOT NULL,
      \`user_id\`             CHAR(36)      NOT NULL,
      \`order_number\`        VARCHAR(50)   NOT NULL,
      \`status\`              VARCHAR(20)   NOT NULL DEFAULT 'pending',
      \`subtotal\`            DECIMAL(12,2) NOT NULL,
      \`total_gst\`           DECIMAL(12,2) NOT NULL,
      \`total_amount\`        DECIMAL(12,2) NOT NULL,
      \`promotion_id\`        CHAR(36),
      \`promotion_discount\`  DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`promotion_title\`     VARCHAR(300),
      \`notes\`               TEXT,
      \`confirmed_at\`        DATETIME,
      \`ready_at\`            DATETIME,
      \`picked_up_at\`        DATETIME,
      \`cancelled_at\`        DATETIME,
      \`cancellation_reason\` VARCHAR(500),
      \`created_at\`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`orders_number_unique\`   (\`order_number\`),
      KEY \`idx_orders_user\`           (\`user_id\`),
      KEY \`idx_orders_status\`         (\`status\`),
      KEY \`idx_orders_created\`        (\`created_at\`),
      KEY \`idx_orders_status_created\` (\`status\`, \`created_at\`),
      KEY \`idx_orders_promo\`          (\`promotion_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'orders');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`order_items\` (
      \`id\`              CHAR(36)      NOT NULL,
      \`order_id\`        CHAR(36)      NOT NULL,
      \`product_id\`      CHAR(36)      NOT NULL,
      \`product_name_en\` VARCHAR(200)  NOT NULL,
      \`quantity\`        INT           NOT NULL,
      \`unit_type\`       VARCHAR(20)   NOT NULL,
      \`unit_price\`      DECIMAL(10,2) NOT NULL,
      \`gst_percentage\`  DECIMAL(5,2)  NOT NULL,
      \`gst_amount\`      DECIMAL(10,2) NOT NULL,
      \`subtotal\`        DECIMAL(12,2) NOT NULL,
      \`total\`           DECIMAL(12,2) NOT NULL,
      \`created_at\`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_order_items_order\`   (\`order_id\`),
      KEY \`idx_order_items_product\` (\`product_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'order_items');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`invoices\` (
      \`id\`               CHAR(36)      NOT NULL,
      \`order_id\`         CHAR(36)      NOT NULL,
      \`invoice_number\`   VARCHAR(50)   NOT NULL,
      \`store_name\`       VARCHAR(200)  NOT NULL,
      \`store_gst_number\` VARCHAR(50)   NOT NULL,
      \`store_address\`    TEXT          NOT NULL,
      \`store_phone\`      VARCHAR(20)   NOT NULL,
      \`customer_name\`    VARCHAR(100)  NOT NULL,
      \`customer_phone\`   VARCHAR(15)   NOT NULL,
      \`customer_address\` TEXT,
      \`subtotal\`         DECIMAL(12,2) NOT NULL,
      \`cgst\`             DECIMAL(12,2) NOT NULL,
      \`sgst\`             DECIMAL(12,2) NOT NULL,
      \`total_gst\`        DECIMAL(12,2) NOT NULL,
      \`total_amount\`     DECIMAL(12,2) NOT NULL,
      \`is_paid\`          TINYINT(1)    NOT NULL DEFAULT 0,
      \`paid_at\`          DATETIME,
      \`payment_method\`   VARCHAR(50),
      \`email_sent\`       TINYINT(1)    NOT NULL DEFAULT 0,
      \`email_sent_at\`    DATETIME,
      \`email_attempts\`   INT           NOT NULL DEFAULT 0,
      \`sms_sent\`         TINYINT(1)    NOT NULL DEFAULT 0,
      \`created_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`invoices_order_unique\`  (\`order_id\`),
      UNIQUE KEY \`invoices_number_unique\` (\`invoice_number\`),
      KEY \`idx_invoices_created\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'invoices');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`admin_logs\` (
      \`id\`          CHAR(36)     NOT NULL,
      \`admin_id\`    CHAR(36)     NOT NULL,
      \`action\`      VARCHAR(100) NOT NULL,
      \`entity_type\` VARCHAR(50),
      \`entity_id\`   CHAR(36),
      \`old_value\`   JSON,
      \`new_value\`   JSON,
      \`ip_address\`  VARCHAR(45),
      \`user_agent\`  VARCHAR(500),
      \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_admin_logs_admin\`   (\`admin_id\`),
      KEY \`idx_admin_logs_action\`  (\`action\`),
      KEY \`idx_admin_logs_entity\`  (\`entity_type\`, \`entity_id\`),
      KEY \`idx_admin_logs_created\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'admin_logs');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`system_config\` (
      \`id\`           CHAR(36)     NOT NULL,
      \`config_key\`   VARCHAR(100) NOT NULL,
      \`config_value\` TEXT         NOT NULL,
      \`description\`  VARCHAR(255),
      \`is_active\`    TINYINT(1)   NOT NULL DEFAULT 1,
      \`created_at\`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`system_config_key_unique\` (\`config_key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'system_config');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`store_settings\` (
      \`key\`         VARCHAR(100) NOT NULL,
      \`value\`       TEXT         NOT NULL,
      \`label\`       VARCHAR(200),
      \`description\` TEXT,
      \`updated_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'store_settings');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`linked_identities\` (
      \`id\`              CHAR(36)     NOT NULL,
      \`primary_user_id\` CHAR(36)     NOT NULL,
      \`linked_email\`    VARCHAR(100) NOT NULL,
      \`linked_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`linked_identities_email_unique\` (\`linked_email\`),
      KEY \`idx_linked_identities_user\` (\`primary_user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'linked_identities');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`merge_sessions\` (
      \`id\`                     CHAR(36)     NOT NULL,
      \`new_email\`              VARCHAR(100) NOT NULL,
      \`existing_user_id\`       CHAR(36)     NOT NULL,
      \`phone\`                  VARCHAR(15)  NOT NULL,
      \`new_user_data\`          JSON         NOT NULL,
      \`primary_otp_verified\`   TINYINT(1)   NOT NULL DEFAULT 0,
      \`secondary_otp_verified\` TINYINT(1)   NOT NULL DEFAULT 0,
      \`status\`                 VARCHAR(20)  NOT NULL DEFAULT 'pending',
      \`ip_address\`             VARCHAR(45),
      \`expires_at\`             DATETIME NOT NULL,
      \`created_at\`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_merge_sessions_email\`   (\`new_email\`),
      KEY \`idx_merge_sessions_expires\` (\`expires_at\`),
      KEY \`idx_merge_sessions_status\`  (\`status\`),
      KEY \`idx_merge_sessions_user\`    (\`existing_user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'merge_sessions');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`merge_otps\` (
      \`id\`               CHAR(36)     NOT NULL,
      \`merge_session_id\` CHAR(36)     NOT NULL,
      \`email\`            VARCHAR(100) NOT NULL,
      \`side\`             VARCHAR(20)  NOT NULL,
      \`otp_hash\`         VARCHAR(64)  NOT NULL,
      \`attempts\`         INT          NOT NULL DEFAULT 0,
      \`is_verified\`      TINYINT(1)   NOT NULL DEFAULT 0,
      \`expires_at\`       DATETIME NOT NULL,
      \`created_at\`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_merge_otps_session\` (\`merge_session_id\`),
      KEY \`idx_merge_otps_email\`   (\`email\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'merge_otps');

  await createTable(c, `
    CREATE TABLE IF NOT EXISTS \`merge_audit_log\` (
      \`id\`               CHAR(36)     NOT NULL,
      \`merge_session_id\` CHAR(36),
      \`primary_user_id\`  CHAR(36)     NOT NULL,
      \`existing_email\`   VARCHAR(100) NOT NULL,
      \`new_email\`        VARCHAR(100) NOT NULL,
      \`merged_at\`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`ip_address\`       VARCHAR(45),
      PRIMARY KEY (\`id\`),
      KEY \`idx_merge_audit_user\` (\`primary_user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'merge_audit_log');

  // ━━━ Step 3: Add all foreign key constraints via ALTER TABLE ━━━━━━━━━━━━━
  console.log('\n── Phase 2: Adding foreign key constraints ───────────────────');
  await c.query('SET FOREIGN_KEY_CHECKS = 0');

  const fkList = [
    ['users',                'fk_users_role',              '`role_id`',           'roles',            '`id`',  'ON DELETE RESTRICT'],
    ['refresh_tokens',       'fk_refresh_tokens_user',     '`user_id`',           'users',            '`id`',  'ON DELETE CASCADE'],
    ['categories',           'fk_categories_parent',       '`parent_id`',         'categories',       '`id`',  'ON DELETE CASCADE'],
    ['category_translations','fk_cat_trans_cat',           '`category_id`',       'categories',       '`id`',  'ON DELETE CASCADE'],
    ['products',             'fk_products_category',       '`category_id`',       'categories',       '`id`',  'ON DELETE RESTRICT'],
    ['products',             'fk_products_parent',         '`parent_product_id`', 'products',         '`id`',  'ON DELETE SET NULL'],
    ['product_translations', 'fk_prod_trans_product',      '`product_id`',        'products',         '`id`',  'ON DELETE CASCADE'],
    ['promotions',           'fk_promotions_free_product', '`free_product_id`',   'products',         '`id`',  'ON DELETE SET NULL'],
    ['promotion_products',   'fk_promo_products_promo',    '`promotion_id`',      'promotions',       '`id`',  'ON DELETE CASCADE'],
    ['promotion_products',   'fk_promo_products_product',  '`product_id`',        'products',         '`id`',  'ON DELETE CASCADE'],
    ['carts',                'fk_carts_user',              '`user_id`',           'users',            '`id`',  'ON DELETE CASCADE'],
    ['cart_items',           'fk_cart_items_cart',         '`cart_id`',           'carts',            '`id`',  'ON DELETE CASCADE'],
    ['cart_items',           'fk_cart_items_product',      '`product_id`',        'products',         '`id`',  'ON DELETE CASCADE'],
    ['orders',               'fk_orders_user',             '`user_id`',           'users',            '`id`',  'ON DELETE RESTRICT'],
    ['orders',               'fk_orders_promo',            '`promotion_id`',      'promotions',       '`id`',  'ON DELETE SET NULL'],
    ['order_items',          'fk_order_items_order',       '`order_id`',          'orders',           '`id`',  'ON DELETE CASCADE'],
    ['order_items',          'fk_order_items_product',     '`product_id`',        'products',         '`id`',  'ON DELETE RESTRICT'],
    ['invoices',             'fk_invoices_order',          '`order_id`',          'orders',           '`id`',  'ON DELETE RESTRICT'],
    ['admin_logs',           'fk_admin_logs_admin',        '`admin_id`',          'users',            '`id`',  'ON DELETE CASCADE'],
    ['linked_identities',    'fk_linked_identities_user',  '`primary_user_id`',   'users',            '`id`',  'ON DELETE CASCADE'],
    ['merge_sessions',       'fk_merge_sessions_user',     '`existing_user_id`',  'users',            '`id`',  'ON DELETE CASCADE'],
    ['merge_otps',           'fk_merge_otps_session',      '`merge_session_id`',  'merge_sessions',   '`id`',  'ON DELETE CASCADE'],
  ];

  for (const [tbl, name, col, refTbl, refCol, action] of fkList) {
    const sql = `ALTER TABLE \`${tbl}\` ADD CONSTRAINT \`${name}\`
      FOREIGN KEY (${col}) REFERENCES \`${refTbl}\` (${refCol}) ${action}`;
    try {
      await c.query(sql);
      console.log(`  ✓ ${name}`);
    } catch (e) {
      // errno 1061 = ER_DUP_KEYNAME (FK already exists) — safe on re-runs
      if (e.errno === 1061) {
        console.log(`  ~ ${name} (already exists)`);
      } else {
        throw e;
      }
    }
  }

  await c.query('SET FOREIGN_KEY_CHECKS = 1');

  // ━━━ Step 4: Seed default data ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n── Phase 3: Seeding default data ─────────────────────────────');

  const roleRows = [
    [uuidv4(), 'admin',              'System administrator'],
    [uuidv4(), 'retail_customer',    'Retail customer'],
    [uuidv4(), 'wholesale_customer', 'Wholesale customer'],
  ];
  for (const [id, name, desc] of roleRows) {
    await c.query(
      'INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES (?, ?, ?)',
      [id, name, desc],
    );
  }
  console.log('  ✓ roles (3 default roles)');

  const configRows = [
    [uuidv4(), 'max_customers',          '500',  'Maximum active customers'],
    [uuidv4(), 'max_products',           '5000', 'Maximum product catalogue size'],
    [uuidv4(), 'default_gst_percentage', '18',   'Default GST percentage'],
    [uuidv4(), 'cooking_oil_gst',        '5',    'GST % for cooking oils (lower slab)'],
  ];
  for (const [id, key, val, desc] of configRows) {
    await c.query(
      'INSERT IGNORE INTO `system_config` (`id`, `config_key`, `config_value`, `description`) VALUES (?, ?, ?, ?)',
      [id, key, val, desc],
    );
  }
  console.log('  ✓ system_config (4 entries)');

  const settingRows = [
    ['min_order_amount', '100', 'Minimum Order Amount (₹)', 'Minimum cart value required to place an order.'],
    ['delivery_charge',  '0',   'Delivery Charge (₹)',      'Flat delivery fee added to every order.'],
    ['handling_charge',  '2',   'Handling Charge (₹)',      'Small handling/packaging fee per order.'],
  ];
  for (const [key, val, label, desc] of settingRows) {
    await c.query(
      'INSERT IGNORE INTO `store_settings` (`key`, `value`, `label`, `description`) VALUES (?, ?, ?, ?)',
      [key, val, label, desc],
    );
  }
  console.log('  ✓ store_settings (3 entries)');

  // ━━━ Step 5: Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [tables] = await c.query('SHOW TABLES');
  console.log(`\n${'─'.repeat(60)}`);
  console.log('✅  MySQL Migration Complete!');
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Database : ${MYSQL_DB}`);
  console.log(`  Tables   : ${tables.length}`);
  tables.forEach((row) => console.log('    -', Object.values(row)[0]));
  console.log();
  console.log('  To activate MySQL, set in backend/.env:');
  console.log('    DB_TYPE=mysql');
  console.log();
  console.log('  Supabase/PostgreSQL credentials are unchanged.');
  console.log(`${'─'.repeat(60)}\n`);

  await c.end();
}

// ─── entry point ─────────────────────────────────────────────────────────────

if (require.main === module) {
  migrate().catch((err) => {
    console.error('\n❌ MySQL migration failed:', err.message);
    if (err.sql) console.error('   SQL:', err.sql);
    process.exit(1);
  });
}

module.exports = migrate;

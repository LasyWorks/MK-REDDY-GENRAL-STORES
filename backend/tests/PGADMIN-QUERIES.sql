-- ============================================================
-- MK Reddy General Stores — pgAdmin4 Query Reference
-- Database: mk_kirana_stores
-- ============================================================
-- HOW TO USE:
--   1. Open pgAdmin4
--   2. Connect to server (host: localhost, port: 5432, user: postgres)
--   3. Expand: Servers > PostgreSQL > Databases > mk_kirana_stores
--   4. Right-click mk_kirana_stores > Query Tool
--   5. Paste any query below and press F5 (or click Run)
-- ============================================================


-- ============================================================
-- SECTION 1: OVERVIEW — ROW COUNTS FOR ALL TABLES
-- ============================================================

SELECT
  'roles'                AS table_name, COUNT(*) AS rows FROM roles UNION ALL
SELECT 'users',               COUNT(*) FROM users UNION ALL
SELECT 'categories',          COUNT(*) FROM categories UNION ALL
SELECT 'category_translations', COUNT(*) FROM category_translations UNION ALL
SELECT 'products',            COUNT(*) FROM products UNION ALL
SELECT 'product_translations', COUNT(*) FROM product_translations UNION ALL
SELECT 'otps',                COUNT(*) FROM otps UNION ALL
SELECT 'refresh_tokens',      COUNT(*) FROM refresh_tokens UNION ALL
SELECT 'gst_config',          COUNT(*) FROM gst_config UNION ALL
SELECT 'carts',               COUNT(*) FROM carts UNION ALL
SELECT 'cart_items',          COUNT(*) FROM cart_items UNION ALL
SELECT 'orders',              COUNT(*) FROM orders UNION ALL
SELECT 'order_items',         COUNT(*) FROM order_items UNION ALL
SELECT 'invoices',            COUNT(*) FROM invoices UNION ALL
SELECT 'admin_logs',          COUNT(*) FROM admin_logs UNION ALL
SELECT 'system_config',       COUNT(*) FROM system_config UNION ALL
SELECT 'email_queue',         COUNT(*) FROM email_queue
ORDER BY table_name;


-- ============================================================
-- SECTION 2: USERS
-- ============================================================

-- All users with role name
SELECT
  u.id,
  r.name          AS role,
  u.name,
  u.phone,
  u.email,
  u.user_type,
  u.is_active,
  u.is_blocked,
  u.last_login_at,
  u.created_at
FROM users u
JOIN roles r ON r.id = u.role_id
ORDER BY u.id;

-- Only admin users
SELECT u.id, u.name, u.phone, u.email, u.last_login_at
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'admin';

-- Blocked users
SELECT id, name, phone, blocked_reason, created_at
FROM users
WHERE is_blocked = TRUE;

-- Users who logged in today
SELECT id, name, phone, last_login_at
FROM users
WHERE last_login_at >= CURRENT_DATE;


-- ============================================================
-- SECTION 3: CATEGORIES WITH TRANSLATIONS
-- ============================================================

-- All categories with English and Telugu names side by side
SELECT
  c.id,
  en.name         AS name_english,
  te.name         AS name_telugu,
  en.description  AS description_english,
  c.display_order,
  c.is_active,
  c.created_at
FROM categories c
LEFT JOIN category_translations en ON en.category_id = c.id AND en.lang_code = 'en'
LEFT JOIN category_translations te ON te.category_id = c.id AND te.lang_code = 'te'
ORDER BY c.display_order;

-- Count products per category
SELECT
  c.id,
  en.name         AS category_name,
  COUNT(p.id)     AS total_products,
  SUM(p.stock_quantity) AS total_stock
FROM categories c
LEFT JOIN category_translations en ON en.category_id = c.id AND en.lang_code = 'en'
LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
GROUP BY c.id, en.name
ORDER BY c.display_order;


-- ============================================================
-- SECTION 4: PRODUCTS
-- ============================================================

-- All products with English and Telugu names
SELECT
  p.id,
  p.sku,
  en.name         AS name_english,
  te.name         AS name_telugu,
  cat_en.name     AS category,
  p.unit_type,
  p.price,
  p.wholesale_price,
  p.gst_percentage,
  p.stock_quantity,
  p.min_order_quantity,
  p.is_active,
  p.is_featured,
  p.created_at
FROM products p
LEFT JOIN product_translations en  ON en.product_id = p.id  AND en.lang_code = 'en'
LEFT JOIN product_translations te  ON te.product_id = p.id  AND te.lang_code = 'te'
LEFT JOIN categories c             ON c.id = p.category_id
LEFT JOIN category_translations cat_en ON cat_en.category_id = c.id AND cat_en.lang_code = 'en'
ORDER BY p.id;

-- Low stock products (below 20 units)
SELECT
  p.id,
  p.sku,
  en.name         AS product_name,
  p.stock_quantity,
  p.unit_type
FROM products p
LEFT JOIN product_translations en ON en.product_id = p.id AND en.lang_code = 'en'
WHERE p.stock_quantity < 20 AND p.is_active = TRUE
ORDER BY p.stock_quantity ASC;

-- Featured products
SELECT
  p.id, p.sku, en.name AS product_name, p.price, p.stock_quantity
FROM products p
LEFT JOIN product_translations en ON en.product_id = p.id AND en.lang_code = 'en'
WHERE p.is_featured = TRUE AND p.is_active = TRUE;

-- Products by price range (50 to 200)
SELECT
  p.id, p.sku, en.name AS product_name, p.price, p.unit_type
FROM products p
LEFT JOIN product_translations en ON en.product_id = p.id AND en.lang_code = 'en'
WHERE p.price BETWEEN 50 AND 200 AND p.is_active = TRUE
ORDER BY p.price ASC;

-- Full-text search in product name (English or Telugu)
SELECT
  p.id, p.sku, en.name AS name_en, te.name AS name_te, p.price
FROM products p
LEFT JOIN product_translations en ON en.product_id = p.id AND en.lang_code = 'en'
LEFT JOIN product_translations te ON te.product_id = p.id AND te.lang_code = 'te'
WHERE en.name ILIKE '%rice%' OR te.name ILIKE '%బియ్యం%';


-- ============================================================
-- SECTION 5: OTPs
-- ============================================================

-- All OTPs (most recent first)
SELECT
  id,
  phone,
  purpose,
  attempts,
  is_verified,
  expires_at,
  CASE WHEN expires_at < NOW() THEN 'EXPIRED' ELSE 'VALID' END AS status,
  created_at
FROM otps
ORDER BY created_at DESC
LIMIT 50;

-- Active (non-expired, non-verified) OTPs
SELECT id, phone, purpose, attempts, expires_at
FROM otps
WHERE is_verified = FALSE AND expires_at > NOW()
ORDER BY created_at DESC;

-- OTPs sent in last 30 minutes (for a phone number)
SELECT id, phone, purpose, attempts, created_at
FROM otps
WHERE phone = '9876543210'
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;


-- ============================================================
-- SECTION 6: CARTS
-- ============================================================

-- All active carts with item count and total value
SELECT
  c.id            AS cart_id,
  u.name          AS customer_name,
  u.phone,
  COUNT(ci.id)    AS item_count,
  SUM(ci.quantity * ci.unit_price) AS cart_total,
  c.updated_at
FROM carts c
JOIN users u    ON u.id = c.user_id
LEFT JOIN cart_items ci ON ci.cart_id = c.id
GROUP BY c.id, u.name, u.phone, c.updated_at
ORDER BY c.updated_at DESC;

-- Cart detail for a specific user (by phone)
SELECT
  ci.id          AS cart_item_id,
  en.name        AS product_name,
  p.sku,
  ci.quantity,
  p.unit_type,
  ci.unit_price,
  ci.quantity * ci.unit_price AS line_total
FROM cart_items ci
JOIN products p ON p.id = ci.product_id
JOIN product_translations en ON en.product_id = p.id AND en.lang_code = 'en'
JOIN carts c   ON c.id = ci.cart_id
JOIN users u   ON u.id = c.user_id
WHERE u.phone = '9876543210';


-- ============================================================
-- SECTION 7: ORDERS
-- ============================================================

-- All orders with customer name and status
SELECT
  o.id,
  o.order_number,
  u.name          AS customer_name,
  u.phone,
  o.status,
  o.subtotal,
  o.total_gst,
  o.total_amount,
  o.created_at,
  o.confirmed_at,
  o.picked_up_at
FROM orders o
JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC;

-- Orders by status
SELECT o.id, o.order_number, u.name, u.phone, o.total_amount, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'         -- change to: confirmed | ready_for_pickup | picked_up | cancelled
ORDER BY o.created_at;

-- Order items detail for a specific order
SELECT
  oi.id,
  oi.product_name_en,
  oi.quantity,
  oi.unit_type,
  oi.unit_price,
  oi.gst_percentage,
  oi.gst_amount,
  oi.subtotal,
  oi.total
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.order_number = 'ORD-20260221-0001';   -- replace with actual order number

-- Orders today
SELECT o.id, o.order_number, u.name, o.status, o.total_amount, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.created_at >= CURRENT_DATE
ORDER BY o.created_at DESC;

-- Revenue summary by day (last 7 days)
SELECT
  DATE(o.created_at)    AS order_date,
  COUNT(o.id)           AS total_orders,
  SUM(o.total_amount)   AS revenue,
  SUM(o.total_gst)      AS gst_collected
FROM orders o
WHERE o.status != 'cancelled'
  AND o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- Revenue by month
SELECT
  TO_CHAR(o.created_at, 'YYYY-MM') AS month,
  COUNT(o.id)                       AS total_orders,
  SUM(o.total_amount)               AS revenue
FROM orders o
WHERE o.status != 'cancelled'
GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
ORDER BY month DESC;

-- Top 10 customers by order value
SELECT
  u.id,
  u.name,
  u.phone,
  u.user_type,
  COUNT(o.id)         AS order_count,
  SUM(o.total_amount) AS total_spent
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status != 'cancelled'
GROUP BY u.id, u.name, u.phone, u.user_type
ORDER BY total_spent DESC
LIMIT 10;

-- Top 10 best-selling products
SELECT
  oi.product_name_en,
  SUM(oi.quantity)       AS total_qty_sold,
  SUM(oi.total)          AS total_revenue,
  COUNT(DISTINCT oi.order_id) AS in_orders
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY oi.product_name_en
ORDER BY total_qty_sold DESC
LIMIT 10;


-- ============================================================
-- SECTION 8: INVOICES
-- ============================================================

-- All invoices
SELECT
  i.id,
  i.invoice_number,
  o.order_number,
  i.customer_name,
  i.customer_phone,
  i.subtotal,
  i.total_gst,
  i.total_amount,
  i.is_paid,
  i.email_sent,
  i.sms_sent,
  i.created_at
FROM invoices i
JOIN orders o ON o.id = i.order_id
ORDER BY i.created_at DESC;

-- Unpaid invoices
SELECT
  i.invoice_number,
  i.customer_name,
  i.customer_phone,
  i.total_amount,
  i.created_at
FROM invoices i
WHERE i.is_paid = FALSE
ORDER BY i.created_at;

-- Invoices where email was NOT sent
SELECT i.invoice_number, i.customer_name, i.customer_phone, i.email_attempts
FROM invoices i
WHERE i.email_sent = FALSE
ORDER BY i.created_at DESC;


-- ============================================================
-- SECTION 9: ADMIN LOGS
-- ============================================================

-- Recent admin actions (last 100)
SELECT
  al.id,
  u.name          AS admin_name,
  u.phone,
  al.action,
  al.entity_type,
  al.entity_id,
  al.ip_address,
  al.created_at
FROM admin_logs al
JOIN users u ON u.id = al.admin_id
ORDER BY al.created_at DESC
LIMIT 100;

-- Admin logs for a specific action type
SELECT al.id, u.name, al.action, al.entity_type, al.entity_id, al.old_value, al.new_value, al.created_at
FROM admin_logs al
JOIN users u ON u.id = al.admin_id
WHERE al.action ILIKE '%status%'    -- change to: login | create | update | delete | block
ORDER BY al.created_at DESC;


-- ============================================================
-- SECTION 10: SYSTEM CONFIG & GST
-- ============================================================

-- All system config values
SELECT config_key, config_value, description, is_active
FROM system_config
ORDER BY config_key;

-- GST config
SELECT id, category_name, gst_percentage, description, is_active
FROM gst_config
ORDER BY gst_percentage;

-- Refresh tokens (active sessions)
SELECT
  rt.id,
  u.name,
  u.phone,
  rt.device_info,
  rt.ip_address,
  rt.expires_at,
  rt.revoked,
  rt.created_at
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE rt.revoked = FALSE AND rt.expires_at > NOW()
ORDER BY rt.created_at DESC;


-- ============================================================
-- SECTION 11: DATABASE MAINTENANCE
-- ============================================================

-- Delete expired OTPs (cleanup)
DELETE FROM otps WHERE expires_at < NOW() - INTERVAL '1 day';

-- Delete expired refresh tokens (cleanup)
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '1 day';

-- List all indexes in the database
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Table sizes on disk
SELECT
  relname                                           AS table_name,
  pg_size_pretty(pg_total_relation_size(relid))     AS total_size,
  pg_size_pretty(pg_relation_size(relid))           AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Active database connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  LEFT(query, 80) AS current_query
FROM pg_stat_activity
WHERE datname = 'mk_kirana_stores'
ORDER BY query_start DESC;

-- Check for any constraint violations (foreign key summary)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name  AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

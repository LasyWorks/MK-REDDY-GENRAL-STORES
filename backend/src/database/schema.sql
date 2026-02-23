-- MK Kirana Stores Database Schema (PostgreSQL 15+)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- UUID v7 generator (time-sortable)
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
DECLARE
  unix_ts_ms bigint;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = (extract(epoch from clock_timestamp()) * 1000)::bigint;
  uuid_bytes = substring(int8send(unix_ts_ms) from 3);
  uuid_bytes = uuid_bytes || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10'   || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ROLES
CREATE TABLE roles (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), name VARCHAR(50) NOT NULL UNIQUE, description VARCHAR(255), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO roles (name, description) VALUES ('admin','System administrator'),('retail_customer','Retail customer'),('wholesale_customer','Wholesale customer');

-- USERS
CREATE TABLE users (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT, name VARCHAR(100) NOT NULL, phone VARCHAR(15) NOT NULL UNIQUE, email VARCHAR(100) UNIQUE, password_hash VARCHAR(255), user_type VARCHAR(20) NOT NULL DEFAULT 'retail' CHECK (user_type IN ('retail','wholesale','admin')), address TEXT, is_active BOOLEAN DEFAULT TRUE, is_blocked BOOLEAN DEFAULT FALSE, blocked_reason VARCHAR(255), last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_users_phone ON users(phone); CREATE INDEX idx_users_email ON users(email); CREATE INDEX idx_users_role ON users(role_id); CREATE INDEX idx_users_active ON users(is_active);
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- OTPS
CREATE TABLE otps (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), phone VARCHAR(15) NOT NULL, otp_hash VARCHAR(64) NOT NULL, purpose VARCHAR(20) NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','register','reset')), attempts INT DEFAULT 0, is_verified BOOLEAN DEFAULT FALSE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_otps_phone ON otps(phone); CREATE INDEX idx_otps_expires ON otps(expires_at);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, token TEXT NOT NULL, device_info VARCHAR(255), ip_address VARCHAR(45), expires_at TIMESTAMPTZ NOT NULL, revoked BOOLEAN DEFAULT FALSE, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id); CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token); CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- CATEGORIES
CREATE TABLE categories (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), parent_id UUID REFERENCES categories(id) ON DELETE CASCADE, image_url VARCHAR(500), display_order INT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- CATEGORY TRANSLATIONS
CREATE TABLE category_translations (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE, lang_code VARCHAR(5) NOT NULL, name VARCHAR(200) NOT NULL, description TEXT, UNIQUE (category_id, lang_code));
CREATE INDEX idx_cat_trans_category ON category_translations(category_id); CREATE INDEX idx_cat_trans_lang ON category_translations(lang_code);

-- PRODUCTS
CREATE TABLE products (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, sku VARCHAR(50) UNIQUE, brand VARCHAR(100), variant VARCHAR(100), unit_type VARCHAR(50), unit_pack_size VARCHAR(100), hsn_code VARCHAR(20), mrp DECIMAL(10,2), purchase_price DECIMAL(10,2), price DECIMAL(10,2) NOT NULL, wholesale_price DECIMAL(10,2), gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 18.00, discount DECIMAL(5,2), margin DECIMAL(5,2), stock_quantity INT NOT NULL DEFAULT 0, min_order_quantity INT DEFAULT 1, max_order_quantity INT, image_url VARCHAR(500), is_active BOOLEAN DEFAULT TRUE, is_featured BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_products_category ON products(category_id); CREATE INDEX idx_products_active ON products(is_active); CREATE INDEX idx_products_featured ON products(is_featured); CREATE INDEX idx_products_sku ON products(sku); CREATE INDEX idx_products_price ON products(price); CREATE INDEX idx_products_stock ON products(stock_quantity); CREATE INDEX idx_products_brand ON products(brand);
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- PRODUCT TRANSLATIONS
CREATE TABLE product_translations (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, lang_code VARCHAR(5) NOT NULL, name VARCHAR(400) NOT NULL, description TEXT, UNIQUE (product_id, lang_code));
CREATE INDEX idx_prod_trans_product ON product_translations(product_id); CREATE INDEX idx_prod_trans_lang ON product_translations(lang_code);
CREATE INDEX idx_prod_trans_name ON product_translations USING gin(name gin_trgm_ops);

-- GST CONFIG
CREATE TABLE gst_config (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), category_name VARCHAR(100) NOT NULL, gst_percentage DECIMAL(5,2) NOT NULL, description VARCHAR(255), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO gst_config (category_name, gst_percentage, description) VALUES ('cooking_oils',5.00,'GST for cooking oils'),('groceries',5.00,'GST for general groceries'),('packaged_foods',12.00,'GST for packaged foods'),('beverages',18.00,'GST for beverages'),('default',18.00,'Default GST rate');

-- CARTS
CREATE TABLE carts (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TRIGGER set_updated_at_carts BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- CART ITEMS
CREATE TABLE cart_items (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, quantity INT NOT NULL DEFAULT 1, unit_price DECIMAL(10,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (cart_id, product_id));
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id); CREATE INDEX idx_cart_items_product ON cart_items(product_id);
CREATE TRIGGER set_updated_at_cart_items BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ORDERS
CREATE TABLE orders (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, order_number VARCHAR(50) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','ready_for_pickup','picked_up','cancelled')), subtotal DECIMAL(12,2) NOT NULL, total_gst DECIMAL(12,2) NOT NULL, total_amount DECIMAL(12,2) NOT NULL, notes TEXT, confirmed_at TIMESTAMPTZ, ready_at TIMESTAMPTZ, picked_up_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, cancellation_reason VARCHAR(500), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_orders_user ON orders(user_id); CREATE INDEX idx_orders_number ON orders(order_number); CREATE INDEX idx_orders_status ON orders(status); CREATE INDEX idx_orders_created ON orders(created_at);
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ORDER ITEMS
CREATE TABLE order_items (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, product_name_en VARCHAR(200) NOT NULL, quantity INT NOT NULL, unit_type VARCHAR(20) NOT NULL, unit_price DECIMAL(10,2) NOT NULL, gst_percentage DECIMAL(5,2) NOT NULL, gst_amount DECIMAL(10,2) NOT NULL, subtotal DECIMAL(12,2) NOT NULL, total DECIMAL(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_order_items_order ON order_items(order_id); CREATE INDEX idx_order_items_product ON order_items(product_id);

-- INVOICES
CREATE TABLE invoices (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT, invoice_number VARCHAR(50) NOT NULL UNIQUE, store_name VARCHAR(200) NOT NULL, store_gst_number VARCHAR(50) NOT NULL, store_address TEXT NOT NULL, store_phone VARCHAR(20) NOT NULL, customer_name VARCHAR(100) NOT NULL, customer_phone VARCHAR(15) NOT NULL, customer_address TEXT, subtotal DECIMAL(12,2) NOT NULL, cgst DECIMAL(12,2) NOT NULL, sgst DECIMAL(12,2) NOT NULL, total_gst DECIMAL(12,2) NOT NULL, total_amount DECIMAL(12,2) NOT NULL, is_paid BOOLEAN DEFAULT FALSE, paid_at TIMESTAMPTZ, payment_method VARCHAR(50), email_sent BOOLEAN DEFAULT FALSE, email_sent_at TIMESTAMPTZ, email_attempts INT DEFAULT 0, sms_sent BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_invoices_order ON invoices(order_id); CREATE INDEX idx_invoices_number ON invoices(invoice_number); CREATE INDEX idx_invoices_created ON invoices(created_at);
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ADMIN LOGS
CREATE TABLE admin_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, action VARCHAR(100) NOT NULL, entity_type VARCHAR(50), entity_id UUID, old_value JSONB, new_value JSONB, ip_address VARCHAR(45), user_agent VARCHAR(500), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id); CREATE INDEX idx_admin_logs_action ON admin_logs(action); CREATE INDEX idx_admin_logs_entity ON admin_logs(entity_type,entity_id); CREATE INDEX idx_admin_logs_created ON admin_logs(created_at);

-- SYSTEM CONFIG
CREATE TABLE system_config (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), config_key VARCHAR(100) NOT NULL UNIQUE, config_value TEXT NOT NULL, description VARCHAR(255), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO system_config (config_key,config_value,description) VALUES ('max_customers','50','Max customers'),('max_products','500','Max products'),('default_gst_percentage','18','Default GST %'),('cooking_oil_gst','5','GST % for cooking oils');
CREATE TRIGGER set_updated_at_system_config BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- EMAIL QUEUE
CREATE TABLE email_queue (id UUID PRIMARY KEY DEFAULT uuid_generate_v7(), to_email VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL, body TEXT NOT NULL, template VARCHAR(50), template_data JSONB, status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')), attempts INT DEFAULT 0, last_error TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX idx_email_queue_status ON email_queue(status); CREATE INDEX idx_email_queue_created ON email_queue(created_at);
CREATE TRIGGER set_updated_at_email_queue BEFORE UPDATE ON email_queue FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- MK Kirana Stores Database Schema
-- MySQL 8.x with InnoDB Engine
-- Created: 2024

-- Drop database if exists and create new
DROP DATABASE IF EXISTS mk_kirana_stores;
CREATE DATABASE mk_kirana_stores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mk_kirana_stores;

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
    ('admin', 'System administrator with full access'),
    ('retail_customer', 'Retail customer with standard pricing'),
    ('wholesale_customer', 'Wholesale customer with bulk pricing');

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    user_type ENUM('retail', 'wholesale', 'admin') NOT NULL DEFAULT 'retail',
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason VARCHAR(255),
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_users_phone (phone),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_active (is_active),
    INDEX idx_users_type (user_type)
) ENGINE=InnoDB;

-- ============================================
-- OTP TABLE
-- ============================================
CREATE TABLE otps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(15) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    purpose ENUM('login', 'register', 'reset') NOT NULL DEFAULT 'login',
    attempts INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otps_phone (phone),
    INDEX idx_otps_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_token (token(255)),
    INDEX idx_refresh_tokens_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name_en VARCHAR(100) NOT NULL,
    name_te VARCHAR(200),
    description_en TEXT,
    description_te TEXT,
    image_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_active (is_active),
    INDEX idx_categories_order (display_order)
) ENGINE=InnoDB;

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    sku VARCHAR(50) UNIQUE,
    name_en VARCHAR(200) NOT NULL,
    name_te VARCHAR(400),
    description_en TEXT,
    description_te TEXT,
    unit_type ENUM('kg', 'piece', 'case', 'litre', 'gram', 'pack') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    wholesale_price DECIMAL(10, 2),
    gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_order_quantity INT DEFAULT 1,
    max_order_quantity INT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_products_category (category_id),
    INDEX idx_products_active (is_active),
    INDEX idx_products_featured (is_featured),
    INDEX idx_products_sku (sku),
    INDEX idx_products_name_en (name_en),
    INDEX idx_products_price (price),
    INDEX idx_products_stock (stock_quantity),
    FULLTEXT INDEX ft_products_name (name_en, name_te)
) ENGINE=InnoDB;

-- ============================================
-- GST CONFIG TABLE
-- ============================================
CREATE TABLE gst_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    gst_percentage DECIMAL(5, 2) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gst_config_category (category_name)
) ENGINE=InnoDB;

-- Insert default GST configurations
INSERT INTO gst_config (category_name, gst_percentage, description) VALUES 
    ('cooking_oils', 5.00, 'GST for cooking oils'),
    ('groceries', 5.00, 'GST for general groceries'),
    ('packaged_foods', 12.00, 'GST for packaged foods'),
    ('beverages', 18.00, 'GST for beverages'),
    ('default', 18.00, 'Default GST rate');

-- ============================================
-- CARTS TABLE
-- ============================================
CREATE TABLE carts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_carts_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- CART ITEMS TABLE
-- ============================================
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_product (cart_id, product_id),
    INDEX idx_cart_items_cart (cart_id),
    INDEX idx_cart_items_product (product_id)
) ENGINE=InnoDB;

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'confirmed', 'ready_for_pickup', 'picked_up', 'cancelled') NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(12, 2) NOT NULL,
    total_gst DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    pickup_time TIMESTAMP NULL,
    confirmed_at TIMESTAMP NULL,
    ready_at TIMESTAMP NULL,
    picked_up_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_number (order_number),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name_en VARCHAR(200) NOT NULL,
    product_name_te VARCHAR(400),
    quantity INT NOT NULL,
    unit_type VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_percentage DECIMAL(5, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id)
) ENGINE=InnoDB;

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL UNIQUE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Store details (snapshot at invoice time)
    store_name VARCHAR(200) NOT NULL,
    store_gst_number VARCHAR(50) NOT NULL,
    store_address TEXT NOT NULL,
    store_phone VARCHAR(20) NOT NULL,
    
    -- Customer details (snapshot at invoice time)
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    customer_address TEXT,
    
    -- Invoice amounts
    subtotal DECIMAL(12, 2) NOT NULL,
    cgst DECIMAL(12, 2) NOT NULL,
    sgst DECIMAL(12, 2) NOT NULL,
    total_gst DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    
    -- Status
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP NULL,
    payment_method VARCHAR(50),
    
    -- Email delivery
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    email_attempts INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    INDEX idx_invoices_order (order_id),
    INDEX idx_invoices_number (invoice_number),
    INDEX idx_invoices_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- ADMIN LOGS TABLE
-- ============================================
CREATE TABLE admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_logs_admin (admin_id),
    INDEX idx_admin_logs_action (action),
    INDEX idx_admin_logs_entity (entity_type, entity_id),
    INDEX idx_admin_logs_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- SYSTEM CONFIGURATION TABLE
-- ============================================
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_system_config_key (config_key)
) ENGINE=InnoDB;

-- Insert default system configurations
INSERT INTO system_config (config_key, config_value, description) VALUES 
    ('max_customers', '50', 'Maximum number of customers allowed'),
    ('max_products', '500', 'Maximum number of products allowed'),
    ('store_name', 'MK Kirrana Stores', 'Store name'),
    ('store_gst_number', '29XXXXX1234X1ZX', 'Store GST number'),
    ('store_address', '123 Main Street, Hyderabad, Telangana - 500001', 'Store address'),
    ('store_phone', '+91-9876543210', 'Store phone number'),
    ('default_gst_percentage', '18', 'Default GST percentage'),
    ('cooking_oil_gst', '5', 'GST percentage for cooking oils');

-- ============================================
-- EMAIL QUEUE TABLE
-- ============================================
CREATE TABLE email_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    template VARCHAR(50),
    template_data JSON,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_queue_status (status),
    INDEX idx_email_queue_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- CREATE DEFAULT ADMIN USER
-- ============================================
-- Password: admin123 (will be set properly via seed script)
INSERT INTO users (role_id, name, phone, email, user_type, is_active) VALUES 
    (1, 'Admin User', '6305486939', 'talpaneni064@gmail.com', 'admin', TRUE);

-- Note: Stored procedures and event scheduler removed for compatibility
-- Cleanup of expired OTPs and tokens is handled in application code

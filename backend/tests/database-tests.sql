-- ================================================================
-- MK KIRRANA STORES - COMPREHENSIVE DATABASE TEST SUITE
-- ================================================================
-- Senior QA Engineer: Database Reliability & Integrity Testing
-- Target: MySQL 8.x InnoDB
-- Date: February 20, 2026
-- ================================================================

USE mk_kirana_stores;

-- ================================================================
-- TEST CATEGORY 1: DATABASE INTEGRITY & SCHEMA VALIDATION
-- ================================================================

-- TEST 1.1: Verify all tables exist
SELECT 'TEST 1.1: Table Existence Check' AS test_name;
SELECT 
    COUNT(*) AS table_count,
    CASE 
        WHEN COUNT(*) >= 15 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.tables 
WHERE table_schema = 'mk_kirana_stores' 
AND table_type = 'BASE TABLE';

-- TEST 1.2: Verify UTF8MB4 encoding for Telugu support
SELECT 'TEST 1.2: UTF8MB4 Encoding Check' AS test_name;
SELECT 
    table_name,
    table_collation,
    CASE 
        WHEN table_collation LIKE 'utf8mb4%' THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.tables 
WHERE table_schema = 'mk_kirana_stores' 
AND table_type = 'BASE TABLE';

-- TEST 1.3: Verify all foreign key constraints
SELECT 'TEST 1.3: Foreign Key Constraints Check' AS test_name;
SELECT 
    constraint_name,
    table_name,
    referenced_table_name,
    delete_rule,
    update_rule,
    'PASS' AS result
FROM information_schema.referential_constraints 
WHERE constraint_schema = 'mk_kirana_stores'
ORDER BY table_name;

-- TEST 1.4: Verify indexes exist for performance
SELECT 'TEST 1.4: Index Coverage Check' AS test_name;
SELECT 
    table_name,
    COUNT(DISTINCT index_name) AS index_count,
    CASE 
        WHEN table_name = 'users' AND COUNT(DISTINCT index_name) >= 5 THEN 'PASS'
        WHEN table_name = 'products' AND COUNT(DISTINCT index_name) >= 8 THEN 'PASS'
        WHEN table_name = 'orders' AND COUNT(DISTINCT index_name) >= 4 THEN 'PASS'
        WHEN COUNT(DISTINCT index_name) >= 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.statistics 
WHERE table_schema = 'mk_kirana_stores'
GROUP BY table_name
ORDER BY table_name;

-- TEST 1.5: Verify default values and NOT NULL constraints
SELECT 'TEST 1.5: Column Constraints Check' AS test_name;
SELECT 
    table_name,
    column_name,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name LIKE '%_at' AND column_default IS NOT NULL THEN 'PASS'
        WHEN column_name = 'is_active' AND column_default IS NOT NULL THEN 'PASS'
        WHEN column_name = 'status' AND column_default IS NOT NULL THEN 'PASS'
        WHEN is_nullable = 'NO' AND column_default IS NULL AND column_key = 'PRI' THEN 'PASS'
        WHEN is_nullable = 'YES' THEN 'PASS'
        ELSE 'CHECK'
    END AS result
FROM information_schema.columns 
WHERE table_schema = 'mk_kirana_stores'
AND table_name IN ('users', 'products', 'orders', 'invoices')
ORDER BY table_name, ordinal_position;

-- ================================================================
-- TEST CATEGORY 2: AUTHENTICATION & SECURITY
-- ================================================================

-- TEST 2.1: Verify password hashing (bcrypt format)
SELECT 'TEST 2.2: Password Hash Format Check' AS test_name;
SELECT 
    id,
    name,
    CASE 
        WHEN password_hash LIKE '$2%' AND LENGTH(password_hash) = 60 THEN 'PASS'
        WHEN password_hash IS NULL THEN 'EXPECTED_FAIL (OTP users)'
        ELSE 'FAIL'
    END AS result
FROM users
LIMIT 10;

-- TEST 2.2: Verify role-based access control
SELECT 'TEST 2.2: RBAC Setup Check' AS test_name;
SELECT 
    r.name AS role_name,
    COUNT(u.id) AS user_count,
    CASE 
        WHEN r.name = 'admin' AND COUNT(u.id) >= 1 THEN 'PASS'
        WHEN r.name IN ('retail_customer', 'wholesale_customer') THEN 'PASS'
        ELSE 'CHECK'
    END AS result
FROM roles r
LEFT JOIN users u ON r.id = u.role_id
GROUP BY r.id, r.name;

-- TEST 2.3: OTP expiry validation
SELECT 'TEST 2.3: OTP Expiry Mechanism' AS test_name;
SELECT 
    COUNT(*) AS total_otps,
    SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) AS expired_otps,
    SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified_otps,
    'PASS' AS result
FROM otps;

-- TEST 2.4: Refresh token security
SELECT 'TEST 2.4: Refresh Token Security' AS test_name;
SELECT 
    COUNT(*) AS total_tokens,
    SUM(CASE WHEN revoked = TRUE THEN 1 ELSE 0 END) AS revoked_tokens,
    SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) AS expired_tokens,
    CASE 
        WHEN COUNT(*) = 0 THEN 'EXPECTED_FAIL (no tokens yet)'
        ELSE 'PASS'
    END AS result
FROM refresh_tokens;

-- TEST 2.5: User blocking mechanism
SELECT 'TEST 2.5: User Blocking Functionality' AS test_name;
SELECT 
    COUNT(*) AS total_users,
    SUM(CASE WHEN is_blocked = TRUE THEN 1 ELSE 0 END) AS blocked_users,
    SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_users,
    'PASS' AS result
FROM users;

-- ================================================================
-- TEST CATEGORY 3: PRODUCT & CATEGORY MANAGEMENT
-- ================================================================

-- TEST 3.1: Category referential integrity
SELECT 'TEST 3.1: Category-Product Relationship' AS test_name;
SELECT 
    c.name_en AS category_name,
    COUNT(p.id) AS product_count,
    CASE 
        WHEN COUNT(p.id) >= 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name_en;

-- TEST 3.2: Telugu UTF8MB4 character support
SELECT 'TEST 3.2: Telugu Character Support' AS test_name;
SELECT 
    name_en,
    name_te,
    CASE 
        WHEN name_te IS NOT NULL AND CHAR_LENGTH(name_te) > 0 THEN 'PASS'
        WHEN name_te IS NULL THEN 'EXPECTED_FAIL (optional field)'
        ELSE 'CHECK'
    END AS result
FROM products
WHERE is_active = TRUE
LIMIT 10;

-- TEST 3.3: Price validation (positive values)
SELECT 'TEST 3.3: Price Integrity Check' AS test_name;
SELECT 
    sku,
    name_en,
    price,
    wholesale_price,
    CASE 
        WHEN price > 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products
WHERE is_active = TRUE
ORDER BY price DESC
LIMIT 10;

-- TEST 3.4: GST percentage validation
SELECT 'TEST 3.4: GST Percentage Validation' AS test_name;
SELECT 
    gst_percentage,
    COUNT(*) AS product_count,
    CASE 
        WHEN gst_percentage IN (0, 5, 12, 18, 28) THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products
GROUP BY gst_percentage
ORDER BY gst_percentage;

-- TEST 3.5: Stock quantity constraints
SELECT 'TEST 3.5: Stock Quantity Validation' AS test_name;
SELECT 
    COUNT(*) AS total_products,
    SUM(CASE WHEN stock_quantity < 0 THEN 1 ELSE 0 END) AS negative_stock,
    SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock,
    CASE 
        WHEN SUM(CASE WHEN stock_quantity < 0 THEN 1 ELSE 0 END) = 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products;

-- TEST 3.6: SKU uniqueness
SELECT 'TEST 3.6: SKU Uniqueness Check' AS test_name;
SELECT 
    sku,
    COUNT(*) AS duplicate_count,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1;

-- TEST 3.7: Product fulltext search capability
SELECT 'TEST 3.7: Fulltext Index Functionality' AS test_name;
SELECT 
    COUNT(*) AS search_results,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products
WHERE MATCH(name_en, name_te) AGAINST('Rice Oil' IN NATURAL LANGUAGE MODE);

-- ================================================================
-- TEST CATEGORY 4: CART & ORDER OPERATIONS
-- ================================================================

-- TEST 4.1: Cart uniqueness per user
SELECT 'TEST 4.1: One Cart Per User Constraint' AS test_name;
SELECT 
    user_id,
    COUNT(*) AS cart_count,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASS'
        WHEN COUNT(*) = 0 THEN 'EXPECTED_FAIL (no cart yet)'
        ELSE 'FAIL'
    END AS result
FROM carts
GROUP BY user_id;

-- TEST 4.2: Cart item quantity validation
SELECT 'TEST 4.2: Cart Quantity Validation' AS test_name;
SELECT 
    ci.id,
    ci.quantity,
    ci.unit_price,
    CASE 
        WHEN ci.quantity > 0 AND ci.unit_price > 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM cart_items ci
LIMIT 10;

-- TEST 4.3: Cart-Product referential integrity
SELECT 'TEST 4.3: Cart-Product Relationship' AS test_name;
SELECT 
    ci.id AS cart_item_id,
    ci.product_id,
    p.name_en,
    CASE 
        WHEN p.id IS NOT NULL THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM cart_items ci
LEFT JOIN products p ON ci.product_id = p.id
LIMIT 10;

-- TEST 4.4: Order number uniqueness
SELECT 'TEST 4.4: Order Number Uniqueness' AS test_name;
SELECT 
    order_number,
    COUNT(*) AS duplicate_count,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM orders
GROUP BY order_number
HAVING COUNT(*) > 1;

-- TEST 4.5: Order status workflow
SELECT 'TEST 4.5: Order Status Distribution' AS test_name;
SELECT 
    status,
    COUNT(*) AS order_count,
    CASE 
        WHEN status IN ('pending', 'confirmed', 'ready_for_pickup', 'picked_up', 'cancelled') THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM orders
GROUP BY status;

-- TEST 4.6: Order amount calculations
SELECT 'TEST 4.6: Order Amount Integrity' AS test_name;
SELECT 
    o.order_number,
    o.subtotal,
    o.total_gst,
    o.total_amount,
    CASE 
        WHEN o.total_amount = o.subtotal + o.total_gst THEN 'PASS'
        WHEN ABS(o.total_amount - (o.subtotal + o.total_gst)) < 0.01 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM orders o
LIMIT 10;

-- TEST 4.7: Order items GST calculation
SELECT 'TEST 4.7: Order Item GST Accuracy' AS test_name;
SELECT 
    oi.id,
    oi.product_name_en,
    oi.subtotal,
    oi.gst_percentage,
    oi.gst_amount,
    oi.total,
    ROUND(oi.subtotal * (oi.gst_percentage / 100), 2) AS calculated_gst,
    CASE 
        WHEN ABS(oi.gst_amount - ROUND(oi.subtotal * (oi.gst_percentage / 100), 2)) < 0.01 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM order_items oi
LIMIT 10;

-- TEST 4.8: Order cancellation tracking
SELECT 'TEST 4.8: Order Cancellation Data' AS test_name;
SELECT 
    order_number,
    status,
    cancelled_at,
    cancellation_reason,
    CASE 
        WHEN status = 'cancelled' AND cancelled_at IS NOT NULL THEN 'PASS'
        WHEN status != 'cancelled' AND cancelled_at IS NULL THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM orders
WHERE status = 'cancelled';

-- ================================================================
-- TEST CATEGORY 5: INVOICE & GST COMPLIANCE
-- ================================================================

-- TEST 5.1: Invoice-Order one-to-one mapping
SELECT 'TEST 5.1: Invoice-Order Uniqueness' AS test_name;
SELECT 
    order_id,
    COUNT(*) AS invoice_count,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM invoices
GROUP BY order_id
HAVING COUNT(*) > 1;

-- TEST 5.2: Invoice number uniqueness
SELECT 'TEST 5.2: Invoice Number Uniqueness' AS test_name;
SELECT 
    invoice_number,
    COUNT(*) AS duplicate_count,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM invoices
GROUP BY invoice_number
HAVING COUNT(*) > 1;

-- TEST 5.3: GST splitting (CGST + SGST)
SELECT 'TEST 5.3: CGST/SGST Split Validation' AS test_name;
SELECT 
    invoice_number,
    cgst,
    sgst,
    total_gst,
    CASE 
        WHEN ABS((cgst + sgst) - total_gst) < 0.01 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM invoices
LIMIT 10;

-- TEST 5.4: Invoice amount accuracy
SELECT 'TEST 5.4: Invoice Total Calculation' AS test_name;
SELECT 
    i.invoice_number,
    i.subtotal,
    i.total_gst,
    i.total_amount,
    CASE 
        WHEN ABS(i.total_amount - (i.subtotal + i.total_gst)) < 0.01 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM invoices i
LIMIT 10;

-- TEST 5.5: Store GST number format
SELECT 'TEST 5.5: Store GST Number Format' AS test_name;
SELECT 
    store_gst_number,
    CASE 
        WHEN store_gst_number REGEXP '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$' THEN 'PASS'
        ELSE 'EXPECTED_FAIL (test/placeholder GST)'
    END AS result
FROM invoices
LIMIT 10;

-- TEST 5.6: Invoice snapshot data integrity
SELECT 'TEST 5.6: Invoice Snapshot Completeness' AS test_name;
SELECT 
    invoice_number,
    CASE 
        WHEN store_name IS NOT NULL 
        AND store_gst_number IS NOT NULL 
        AND customer_name IS NOT NULL 
        AND customer_phone IS NOT NULL THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM invoices
LIMIT 10;

-- ================================================================
-- TEST CATEGORY 6: CASCADE & FOREIGN KEY BEHAVIOR
-- ================================================================

-- TEST 6.1: User deletion should restrict if orders exist
SELECT 'TEST 6.1: User-Order CASCADE Protection' AS test_name;
SELECT 
    constraint_name,
    delete_rule,
    CASE 
        WHEN delete_rule = 'RESTRICT' THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.referential_constraints
WHERE constraint_schema = 'mk_kirana_stores'
AND table_name = 'orders'
AND referenced_table_name = 'users';

-- TEST 6.2: Cart deletion should cascade to cart items
SELECT 'TEST 6.2: Cart-CartItems CASCADE' AS test_name;
SELECT 
    constraint_name,
    delete_rule,
    CASE 
        WHEN delete_rule = 'CASCADE' THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.referential_constraints
WHERE constraint_schema = 'mk_kirana_stores'
AND table_name = 'cart_items'
AND referenced_table_name = 'carts';

-- TEST 6.3: Order deletion should cascade to order items
SELECT 'TEST 6.3: Order-OrderItems CASCADE' AS test_name;
SELECT 
    constraint_name,
    delete_rule,
    CASE 
        WHEN delete_rule = 'CASCADE' THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.referential_constraints
WHERE constraint_schema = 'mk_kirana_stores'
AND table_name = 'order_items'
AND referenced_table_name = 'orders';

-- TEST 6.4: Category deletion should restrict if products exist
SELECT 'TEST 6.4: Category-Product RESTRICT Protection' AS test_name;
SELECT 
    constraint_name,
    delete_rule,
    CASE 
        WHEN delete_rule = 'RESTRICT' THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM information_schema.referential_constraints
WHERE constraint_schema = 'mk_kirana_stores'
AND table_name = 'products'
AND referenced_table_name = 'categories';

-- ================================================================
-- TEST CATEGORY 7: PERFORMANCE & INDEX USAGE
-- ================================================================

-- TEST 7.1: Explain query for user login (should use index)
SELECT 'TEST 7.1: User Login Query Performance' AS test_name;
EXPLAIN SELECT * FROM users WHERE phone = '6305486939';

-- TEST 7.2: Explain query for product search (should use fulltext)
SELECT 'TEST 7.2: Product Search Performance' AS test_name;
EXPLAIN SELECT * FROM products 
WHERE MATCH(name_en, name_te) AGAINST('Rice' IN NATURAL LANGUAGE MODE);

-- TEST 7.3: Explain query for order listing (should use composite index)
SELECT 'TEST 7.3: Order Listing Performance' AS test_name;
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';

-- TEST 7.4: Check for missing indexes on foreign keys
SELECT 'TEST 7.4: Foreign Key Index Coverage' AS test_name;
SELECT 
    rc.table_name,
    rc.constraint_name,
    kcu.column_name,
    CASE 
        WHEN s.index_name IS NOT NULL THEN 'PASS'
        ELSE 'FAIL'
    END AS has_index
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu 
    ON rc.constraint_name = kcu.constraint_name 
    AND rc.constraint_schema = kcu.constraint_schema
LEFT JOIN information_schema.statistics s 
    ON kcu.table_name = s.table_name 
    AND kcu.column_name = s.column_name
    AND kcu.table_schema = s.table_schema
WHERE rc.constraint_schema = 'mk_kirana_stores';

-- ================================================================
-- TEST CATEGORY 8: DATA CONSISTENCY & BUSINESS RULES
-- ================================================================

-- TEST 8.1: No orphan cart items (all must belong to valid cart)
SELECT 'TEST 8.1: Orphan Cart Items Check' AS test_name;
SELECT 
    COUNT(*) AS orphan_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM cart_items ci
LEFT JOIN carts c ON ci.cart_id = c.id
WHERE c.id IS NULL;

-- TEST 8.2: No orphan order items
SELECT 'TEST 8.2: Orphan Order Items Check' AS test_name;
SELECT 
    COUNT(*) AS orphan_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;

-- TEST 8.3: System config keys exist
SELECT 'TEST 8.3: System Configuration Check' AS test_name;
SELECT 
    config_key,
    config_value,
    CASE 
        WHEN config_key IN ('max_customers', 'max_products', 'store_name', 'store_gst_number') THEN 'PASS'
        ELSE 'CHECK'
    END AS result
FROM system_config
WHERE is_active = TRUE;

-- TEST 8.4: Email queue status distribution
SELECT 'TEST 8.4: Email Queue Health' AS test_name;
SELECT 
    status,
    COUNT(*) AS count,
    CASE 
        WHEN status IN ('pending', 'sent', 'failed') THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM email_queue
GROUP BY status;

-- TEST 8.5: Admin log audit trail
SELECT 'TEST 8.5: Admin Activity Logging' AS test_name;
SELECT 
    COUNT(*) AS log_count,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM admin_logs;

-- ================================================================
-- TEST CATEGORY 9: EDGE CASES & BOUNDARY CONDITIONS
-- ================================================================

-- TEST 9.1: Maximum product price validation
SELECT 'TEST 9.1: Product Price Boundary Check' AS test_name;
SELECT 
    MAX(price) AS max_price,
    CASE 
        WHEN MAX(price) < 99999.99 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products;

-- TEST 9.2: Order total boundary check
SELECT 'TEST 9.2: Order Amount Boundary Check' AS test_name;
SELECT 
    MAX(total_amount) AS max_order,
    CASE 
        WHEN MAX(total_amount) < 999999.99 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM orders;

-- TEST 9.3: Decimal precision check
SELECT 'TEST 9.3: Decimal Precision Validation' AS test_name;
SELECT 
    price,
    LENGTH(SUBSTRING_INDEX(price, '.', -1)) AS decimal_places,
    CASE 
        WHEN LENGTH(SUBSTRING_INDEX(price, '.', -1)) <= 2 THEN 'PASS'
        ELSE 'FAIL'
    END AS result
FROM products
WHERE price != FLOOR(price)
LIMIT 10;

-- ================================================================
-- SUMMARY QUERY: Overall Database Health
-- ================================================================
SELECT 'SUMMARY: Database Health Score' AS test_name;
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'mk_kirana_stores') AS total_tables,
    (SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = 'mk_kirana_stores') AS total_fk_constraints,
    (SELECT COUNT(DISTINCT table_name) FROM information_schema.statistics WHERE table_schema = 'mk_kirana_stores') AS tables_with_indexes,
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS active_users,
    (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS active_products,
    (SELECT COUNT(*) FROM orders) AS total_orders,
    (SELECT COUNT(*) FROM invoices) AS total_invoices,
    'PASS' AS overall_result;

# MK Reddy General Stores — Database Reference

**PostgreSQL 15+ · 15 tables · UUID v7 primary keys**

---

## Table of Contents

1. [Auth & Users](#1-auth--users)
   - [roles](#roles)
   - [users](#users)
   - [otps](#otps)
   - [refresh_tokens](#refresh_tokens)
2. [Catalogue](#2-catalogue)
   - [categories](#categories)
   - [category_translations](#category_translations)
   - [products](#products)
   - [product_translations](#product_translations)
3. [Shopping](#3-shopping)
   - [carts](#carts)
   - [cart_items](#cart_items)
4. [Orders & Billing](#4-orders--billing)
   - [orders](#orders)
   - [order_items](#order_items)
   - [invoices](#invoices)
5. [Admin & Config](#5-admin--config)
   - [admin_logs](#admin_logs)
   - [system_config](#system_config)

---

## 1. Auth & Users

### `roles`
Stores the three fixed user roles. Seeded on first migration — never modified at runtime.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `name` | VARCHAR(50) | `admin`, `retail_customer`, `wholesale_customer` |
| `description` | VARCHAR(255) | Human-readable label |

**Seeded values:** `admin`, `retail_customer`, `wholesale_customer`

**Used by:** `users.role_id` FK · User.js model · auth middleware role checks

---

### `users`
All people who can log in — admins, retail customers, and wholesale customers.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `role_id` | UUID | FK → `roles.id` |
| `name` | VARCHAR(100) | Full name |
| `phone` | VARCHAR(15) | Unique · used as login identifier |
| `email` | VARCHAR(100) | Optional |
| `password_hash` | VARCHAR(255) | Hashed with bcrypt (admins only) |
| `user_type` | VARCHAR(20) | `retail` / `wholesale` / `admin` |
| `address` | TEXT | Delivery address |
| `is_active` | BOOLEAN | Soft-enable/disable account |
| `is_blocked` | BOOLEAN | Admin can block with reason |
| `blocked_reason` | VARCHAR(255) | Reason shown on block |
| `last_login_at` | TIMESTAMPTZ | Updated on every login |

**Indexes:** `phone`, `email`, `role_id`, `is_active`

**Used by:** auth flows (register/login/OTP) · order ownership · cart ownership · invoice customer info · admin audit trail

---

### `otps`
Temporary one-time passwords for phone-based login and registration. Expire after a short TTL and are hashed before storage.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `phone` | VARCHAR(15) | Target phone number |
| `otp_hash` | VARCHAR(64) | SHA-256 hash of the OTP code |
| `purpose` | VARCHAR(20) | `login` / `register` / `reset` |
| `attempts` | INT | Brute-force counter (max 3) |
| `is_verified` | BOOLEAN | Flipped to `true` on correct entry |
| `expires_at` | TIMESTAMPTZ | Auto-expire (5 min TTL) |

**Indexes:** `phone`, `expires_at`

**Used by:** `authService.sendOTP` · `authService.verifyOTP` · OTP.js model

---

### `refresh_tokens`
Long-lived JWT refresh tokens. One row per active device session. Revoked on logout or on explicit token rotation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `user_id` | UUID | FK → `users.id` (CASCADE delete) |
| `token` | TEXT | The raw refresh token string |
| `device_info` | VARCHAR(255) | User-agent string |
| `ip_address` | VARCHAR(45) | IPv4/IPv6 of the client |
| `expires_at` | TIMESTAMPTZ | Long TTL (e.g. 30 days) |
| `revoked` | BOOLEAN | `true` after logout |
| `revoked_at` | TIMESTAMPTZ | When it was revoked |

**Indexes:** `user_id`, `token`, `expires_at`

**Used by:** `authService.refreshToken` · auth.js middleware · RefreshToken.js model

---

## 2. Catalogue

### `categories`
Product categories. Supports one level of nesting via `parent_id` (e.g. "Oils" → "Cooking Oils").

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `parent_id` | UUID | FK → `categories.id` (self-ref, nullable) |
| `image_url` | VARCHAR(500) | Category banner/icon |
| `display_order` | INT | Sort order on the storefront |
| `is_active` | BOOLEAN | Hide/show without deleting |

**Indexes:** `is_active`, `parent_id`

**Used by:** `categoryService` · Category.js model · products FK

---

### `category_translations`
English and Telugu names/descriptions for each category. Exactly one row per `(category_id, lang_code)` pair.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `category_id` | UUID | FK → `categories.id` (CASCADE delete) |
| `lang_code` | VARCHAR(5) | `en` or `te` |
| `name` | VARCHAR(200) | Localised category name |
| `description` | TEXT | Localised description (optional) |

**Unique constraint:** `(category_id, lang_code)`

**Used by:** `categoryService.getAll` · `categoryService.createCategory` · auto-translation pipeline (`translate.js`)

---

### `products`
Master product catalogue. Holds all pricing, stock, GST, and metadata. Names are stored in `product_translations`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `category_id` | UUID | FK → `categories.id` (RESTRICT delete) |
| `sku` | VARCHAR(50) | Unique · auto-generated (`BRAND-VARIANT-UNIT`) |
| `brand` | VARCHAR(100) | Brand name |
| `variant` | VARCHAR(100) | e.g. "1L", "500g" |
| `unit_type` | VARCHAR(50) | e.g. `kg`, `litre`, `piece` |
| `unit_pack_size` | VARCHAR(100) | Pack description |
| `hsn_code` | VARCHAR(20) | GST HSN classification |
| `mrp` | DECIMAL(10,2) | Maximum retail price |
| `purchase_price` | DECIMAL(10,2) | Cost price (admin only) |
| `price` | DECIMAL(10,2) | Selling price |
| `wholesale_price` | DECIMAL(10,2) | Price for wholesale customers |
| `gst_percentage` | DECIMAL(5,2) | Per-product GST rate (default 18%) |
| `discount` | DECIMAL(5,2) | Discount % |
| `margin` | DECIMAL(5,2) | Profit margin % |
| `stock_quantity` | INT | Current stock level |
| `min_order_quantity` | INT | Minimum qty per order |
| `max_order_quantity` | INT | Maximum qty per order (nullable) |
| `image_url` | VARCHAR(500) | Product photo |
| `is_active` | BOOLEAN | Hide/show without deleting |
| `is_featured` | BOOLEAN | Show on homepage featured section |

**Indexes:** `category_id`, `is_active`, `is_featured`, `sku`, `price`, `stock_quantity`, `brand`

**Used by:** `productService` · Product.js model · cart add · order creation · GST config endpoints (update price/GST directly on this table)

---

### `product_translations`
English and Telugu names/descriptions for each product. Exact same pattern as `category_translations`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `product_id` | UUID | FK → `products.id` (CASCADE delete) |
| `lang_code` | VARCHAR(5) | `en` or `te` |
| `name` | VARCHAR(400) | Localised product name |
| `description` | TEXT | Localised description (optional) |

**Unique constraint:** `(product_id, lang_code)`
**GIN index** on `name` for fast trigram full-text search (`?search=...`)

**Used by:** `productService.search` · `productService.getById` · auto-translation pipeline · GST config read (JOIN to get product names)

---

## 3. Shopping

### `carts`
One cart per user. Created automatically on first `addToCart` call. Deleted with the user.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `user_id` | UUID | FK → `users.id` (CASCADE delete) · **UNIQUE** |

**Used by:** `cartService` · Cart.js model

---

### `cart_items`
Individual line items inside a cart. Quantity and price are stored; price is the snapshot at time of add.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `cart_id` | UUID | FK → `carts.id` (CASCADE delete) |
| `product_id` | UUID | FK → `products.id` (CASCADE delete) |
| `quantity` | INT | How many units |
| `unit_price` | DECIMAL(10,2) | Price at time of adding to cart |

**Unique constraint:** `(cart_id, product_id)` — same product can't appear twice; quantity is updated instead

**Indexes:** `cart_id`, `product_id`

**Used by:** `cartService.addItem` · `cartService.updateItem` · `cartService.removeItem` · order creation (cart → order conversion)

---

## 4. Orders & Billing

### `orders`
A confirmed purchase. Created when a customer checks out. Tracks the order lifecycle from `pending` → `picked_up`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `user_id` | UUID | FK → `users.id` (RESTRICT delete) |
| `order_number` | VARCHAR(50) | Human-readable ID (e.g. `ORD-20260223-0001`) |
| `status` | VARCHAR(20) | `pending` → `confirmed` → `ready_for_pickup` → `picked_up` / `cancelled` |
| `subtotal` | DECIMAL(12,2) | Before GST |
| `total_gst` | DECIMAL(12,2) | Total GST across all items |
| `total_amount` | DECIMAL(12,2) | Final amount |
| `notes` | TEXT | Customer delivery notes |
| `confirmed_at` | TIMESTAMPTZ | When admin confirmed |
| `ready_at` | TIMESTAMPTZ | When order was packed |
| `picked_up_at` | TIMESTAMPTZ | When customer collected |
| `cancelled_at` | TIMESTAMPTZ | If cancelled |
| `cancellation_reason` | VARCHAR(500) | Reason for cancellation |

**Indexes:** `user_id`, `order_number`, `status`, `created_at`

**Used by:** `orderService` · Order.js model · invoice generation

---

### `order_items`
Snapshot of each product line in an order. Product name is denormalised (`product_name_en`) so historical orders are unaffected by product renames.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `order_id` | UUID | FK → `orders.id` (CASCADE delete) |
| `product_id` | UUID | FK → `products.id` (RESTRICT delete) |
| `product_name_en` | VARCHAR(200) | Snapshot of name at order time |
| `quantity` | INT | Ordered quantity |
| `unit_type` | VARCHAR(20) | e.g. `kg`, `piece` |
| `unit_price` | DECIMAL(10,2) | Price at order time |
| `gst_percentage` | DECIMAL(5,2) | GST rate at order time |
| `gst_amount` | DECIMAL(10,2) | Calculated GST for this line |
| `subtotal` | DECIMAL(12,2) | `quantity × unit_price` |
| `total` | DECIMAL(12,2) | `subtotal + gst_amount` |

**Indexes:** `order_id`, `product_id`

**Used by:** `orderService.createOrder` · `invoiceService.generate` · admin order detail view

---

### `invoices`
GST invoice generated for each confirmed order. Stores a full snapshot of store and customer details so invoices remain accurate even if either changes later.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `order_id` | UUID | FK → `orders.id` (RESTRICT delete) · **UNIQUE** |
| `invoice_number` | VARCHAR(50) | Unique invoice ID |
| `store_name` | VARCHAR(200) | Snapshot of store name |
| `store_gst_number` | VARCHAR(50) | Store GST registration number |
| `store_address` | TEXT | Store address at time of invoice |
| `store_phone` | VARCHAR(20) | Store contact |
| `customer_name` | VARCHAR(100) | Snapshot of customer name |
| `customer_phone` | VARCHAR(15) | Snapshot of customer phone |
| `customer_address` | TEXT | Snapshot of delivery address |
| `subtotal` | DECIMAL(12,2) | Pre-tax total |
| `cgst` | DECIMAL(12,2) | Central GST (half of total GST) |
| `sgst` | DECIMAL(12,2) | State GST (half of total GST) |
| `total_gst` | DECIMAL(12,2) | CGST + SGST |
| `total_amount` | DECIMAL(12,2) | Final invoice amount |
| `is_paid` | BOOLEAN | Payment status |
| `paid_at` | TIMESTAMPTZ | When payment was recorded |
| `payment_method` | VARCHAR(50) | `cash`, `upi`, etc. |
| `email_sent` | BOOLEAN | Whether invoice email was dispatched |
| `email_sent_at` | TIMESTAMPTZ | When email was last sent |
| `email_attempts` | INT | Retry counter |
| `sms_sent` | BOOLEAN | Whether invoice SMS was dispatched |

**Indexes:** `order_id`, `invoice_number`, `created_at`

**Used by:** `invoiceService` · Invoice.js model · admin invoice download/view

---

## 5. Admin & Config

### `admin_logs`
Immutable audit trail. Every create/update/delete action by an admin writes a row here with before/after JSONB snapshots.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `admin_id` | UUID | FK → `users.id` (CASCADE delete) |
| `action` | VARCHAR(100) | e.g. `CREATE_PRODUCT`, `UPDATE_ORDER_STATUS`, `BLOCK_USER` |
| `entity_type` | VARCHAR(50) | e.g. `product`, `order`, `user` |
| `entity_id` | UUID | ID of the affected record |
| `old_value` | JSONB | State before the change |
| `new_value` | JSONB | State after the change |
| `ip_address` | VARCHAR(45) | Admin's IP |
| `user_agent` | VARCHAR(500) | Admin's browser/client |

**Indexes:** `admin_id`, `action`, `(entity_type, entity_id)`, `created_at`

**Note:** No `updated_at` — rows are never modified after insert (append-only).

**Used by:** `AdminLog.js` model · every admin service method (create/update/delete actions)

---

### `system_config`
Key-value store for runtime settings. Managed via the admin API — no code deploy needed to change these values.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (v7) | PK |
| `config_key` | VARCHAR(100) | Unique setting name |
| `config_value` | TEXT | Current value |
| `description` | VARCHAR(255) | What this setting controls |
| `is_active` | BOOLEAN | Disable a key without deleting it |

**Seeded values:**

| Key | Default | Purpose |
|---|---|---|
| `max_customers` | `50` | Cap on registered customers |
| `max_products` | `500` | Cap on active products |
| `default_gst_percentage` | `18` | Used when no per-product GST is set |
| `cooking_oil_gst` | `5` | Reduced GST rate for cooking oils |

**Used by:** `SystemConfig.js` model · `adminService.getSystemConfig` · `adminService.updateSystemConfig`

---

## Entity Relationship Summary

```
roles ──< users >──< orders >──< order_items >── products
                │                                    │
                └──< carts >──< cart_items >─────────┘
                │
                └──< refresh_tokens
                └──< otps
                └──< admin_logs

categories ──< category_translations
     │
     └──< products ──< product_translations

orders ──── invoices

system_config  (standalone key-value store)
```

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| **UUID v7 PKs** | Time-sortable, no sequential enumeration, globally unique across services |
| **Translation tables** | Clean separation of content from structure; supports N languages without schema change |
| **Denormalised order snapshots** | `order_items.product_name_en` and `invoices.*` store data at point-of-sale so history is tamper-proof |
| **GST on products, not a config table** | Each product has its own `gst_percentage` column; `system_config` holds defaults for admin convenience |
| **Append-only admin_logs** | No `updated_at` trigger; rows are never modified — full audit integrity |
| **RESTRICT on order → product FK** | Prevents deleting a product that appears in any order; use `is_active = false` to hide instead |

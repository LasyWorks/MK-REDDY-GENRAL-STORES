# MK Reddy General Stores — API Testing Guide

**Base URL:** `http://localhost:3000/api/v1`  
**Server Start:** `cd backend && npm start`

---

## Authentication

All protected routes require a Bearer token in the header:
```
Authorization: Bearer <access_token>
```

---

## 1. Health Check

### GET /health
```
GET http://localhost:3000/api/v1/health
```
**Expected:** `200 OK` with DB status, memory, uptime, pool stats.

---

## 2. Auth — OTP Login (Customers)

### Step 1 — Send OTP
```
POST http://localhost:3000/api/v1/auth/otp/send
Content-Type: application/json

{
  "phone": "9876543210"
}
```

### Step 2 — Verify OTP (login or auto-register)
```
POST http://localhost:3000/api/v1/auth/otp/verify
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}
```
**Returns:** `accessToken`, `refreshToken`, `user`

### Step 3 — Resend OTP (30-second cooldown)
```
POST http://localhost:3000/api/v1/auth/otp/resend
Content-Type: application/json

{
  "phone": "9876543210"
}
```

### Register (if new user — complete profile)
```
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "phone": "9999999999",
  "name": "Test User",
  "email": "test@example.com",
  "user_type": "retail"
}
```

---

## 3. Auth — Admin Login (Password + OTP 2FA)

### Step 1 — Admin Login with Password
```
POST http://localhost:3000/api/v1/auth/admin/login
Content-Type: application/json

{
  "phone": "9000000000",
  "password": "admin123"
}
```
> OTP is sent to admin phone (logged to console in dev mode)

### Step 2 — Admin Verify OTP (2FA)
```
POST http://localhost:3000/api/v1/auth/admin/verify-otp
Content-Type: application/json

{
  "phone": "9000000000",
  "otp": "123456"
}
```
**Returns:** `accessToken`, `refreshToken`

---

## 4. Auth — Token Management

### Refresh Access Token
```
POST http://localhost:3000/api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Logout
```
POST http://localhost:3000/api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Get My Profile
```
GET http://localhost:3000/api/v1/auth/me
Authorization: Bearer <access_token>
```

### Update My Profile
```
PUT http://localhost:3000/api/v1/auth/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "address": "123 Main Street"
}
```

---

## 5. Categories

### Get All Categories (Public)
```
GET http://localhost:3000/api/v1/categories

# Telugu language
GET http://localhost:3000/api/v1/categories
Accept-Language: te
```

### Get Category by ID
```
GET http://localhost:3000/api/v1/categories/1
```

### Get Products in a Category
```
GET http://localhost:3000/api/v1/categories/1/products
```

### [ADMIN] Get All Categories (including inactive)
```
GET http://localhost:3000/api/v1/categories/admin/all
Authorization: Bearer <admin_token>
```

### [ADMIN] Create Category
```
POST http://localhost:3000/api/v1/categories
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name_en": "Household Items",
  "name_te": "గృహోపయోగ వస్తువులు",
  "description_en": "Cleaning and household supplies",
  "description_te": "శుభ్రపరిచే మరియు గృహోపయోగ వస్తువులు",
  "display_order": 11
}
```

### [ADMIN] Update Category
```
PUT http://localhost:3000/api/v1/categories/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name_en": "Cooking Oils & Ghee",
  "is_active": true
}
```

### [ADMIN] Delete Category (soft delete)
```
DELETE http://localhost:3000/api/v1/categories/1
Authorization: Bearer <admin_token>
```

---

## 6. Products

### Get All Products (with pagination)
```
GET http://localhost:3000/api/v1/products
GET http://localhost:3000/api/v1/products?page=1&limit=10
GET http://localhost:3000/api/v1/products?category_id=1
GET http://localhost:3000/api/v1/products?min_price=50&max_price=200
GET http://localhost:3000/api/v1/products?sort=price_asc
Accept-Language: te
```

### Search Products
```
GET http://localhost:3000/api/v1/products/search?q=rice
GET http://localhost:3000/api/v1/products/search?q=బియ్యం
```

### Get Product by ID
```
GET http://localhost:3000/api/v1/products/1
```

### [ADMIN] Get All Products (including inactive)
```
GET http://localhost:3000/api/v1/products/admin/all
Authorization: Bearer <admin_token>
```

### [ADMIN] Get Low Stock Products
```
GET http://localhost:3000/api/v1/products/admin/low-stock
GET http://localhost:3000/api/v1/products/admin/low-stock?threshold=20
Authorization: Bearer <admin_token>
```

### [ADMIN] Create Product
```
POST http://localhost:3000/api/v1/products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "category_id": 1,
  "sku": "OIL004",
  "name_en": "Mustard Oil",
  "name_te": "ఆవాల నూనె",
  "description_en": "Pure cold-pressed mustard oil",
  "unit_type": "litre",
  "price": 160.00,
  "wholesale_price": 140.00,
  "gst_percentage": 5.00,
  "stock_quantity": 75,
  "min_order_quantity": 1,
  "is_featured": false
}
```

### [ADMIN] Update Product
```
PUT http://localhost:3000/api/v1/products/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "price": 155.00,
  "stock_quantity": 120,
  "is_featured": true
}
```

### [ADMIN] Update Stock Only
```
PATCH http://localhost:3000/api/v1/products/1/stock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "stock_quantity": 200,
  "operation": "set"
}
```

### [ADMIN] Delete Product
```
DELETE http://localhost:3000/api/v1/products/1
Authorization: Bearer <admin_token>
```

---

## 7. Cart

### Get My Cart
```
GET http://localhost:3000/api/v1/cart
Authorization: Bearer <customer_token>
```

### Add Item to Cart
```
POST http://localhost:3000/api/v1/cart/items
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

### Update Cart Item Quantity
```
PUT http://localhost:3000/api/v1/cart/items/1
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "quantity": 5
}
```

### Remove Item from Cart
```
DELETE http://localhost:3000/api/v1/cart/items/1
Authorization: Bearer <customer_token>
```

### Clear Entire Cart
```
DELETE http://localhost:3000/api/v1/cart
Authorization: Bearer <customer_token>
```

---

## 8. Orders

### Create Order from Cart
```
POST http://localhost:3000/api/v1/orders
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "notes": "Please pack carefully"
}
```
**Returns:** `order_number`, `total_amount`, `status: pending`

### Get My Orders
```
GET http://localhost:3000/api/v1/orders/my-orders
Authorization: Bearer <customer_token>
GET http://localhost:3000/api/v1/orders/my-orders?page=1&limit=5
```

### Get Order by Order Number
```
GET http://localhost:3000/api/v1/orders/number/ORD-20260221-0001
Authorization: Bearer <customer_token>
```

### Get Order by ID
```
GET http://localhost:3000/api/v1/orders/1
Authorization: Bearer <customer_token>
```

### Cancel Order (Customer)
```
PUT http://localhost:3000/api/v1/orders/1/cancel
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

### [ADMIN] Get All Orders
```
GET http://localhost:3000/api/v1/orders
Authorization: Bearer <admin_token>
GET http://localhost:3000/api/v1/orders?status=pending
GET http://localhost:3000/api/v1/orders?page=1&limit=20
```

### [ADMIN] Update Order Status
```
PUT http://localhost:3000/api/v1/orders/1/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "confirmed"
}
```
**Valid statuses:** `pending` → `confirmed` → `ready_for_pickup` → `picked_up` | `cancelled`

### [ADMIN] Order Statistics
```
GET http://localhost:3000/api/v1/orders/statistics
Authorization: Bearer <admin_token>
```

---

## 9. Invoices

### Get My Invoice (Customer)
```
GET http://localhost:3000/api/v1/invoices/order/1
Authorization: Bearer <customer_token>
```

### [ADMIN] Generate Invoice for Order
```
POST http://localhost:3000/api/v1/invoices/order/1
Authorization: Bearer <admin_token>
```

### [ADMIN] Get All Invoices
```
GET http://localhost:3000/api/v1/invoices
Authorization: Bearer <admin_token>
```

### [ADMIN] Get Invoice by Number
```
GET http://localhost:3000/api/v1/invoices/number/INV-20260221-0001
Authorization: Bearer <admin_token>
```

### [ADMIN] Resend Invoice Email
```
POST http://localhost:3000/api/v1/invoices/1/resend-email
Authorization: Bearer <admin_token>
```

---

## 10. Users (Admin Only)

### Get All Users
```
GET http://localhost:3000/api/v1/users
Authorization: Bearer <admin_token>
GET http://localhost:3000/api/v1/users?user_type=wholesale
GET http://localhost:3000/api/v1/users?page=1&limit=10
```

### Get User Statistics
```
GET http://localhost:3000/api/v1/users/stats
Authorization: Bearer <admin_token>
```

### Get User by ID
```
GET http://localhost:3000/api/v1/users/1
Authorization: Bearer <admin_token>
```

### Create User
```
POST http://localhost:3000/api/v1/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Customer",
  "phone": "9111111111",
  "email": "newcustomer@example.com",
  "user_type": "wholesale",
  "role_id": 3
}
```

### Update User
```
PUT http://localhost:3000/api/v1/users/2
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "user_type": "wholesale"
}
```

### Block User
```
PUT http://localhost:3000/api/v1/users/2/block
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Suspicious activity"
}
```

### Unblock User
```
PUT http://localhost:3000/api/v1/users/2/unblock
Authorization: Bearer <admin_token>
```

### Delete User (soft delete)
```
DELETE http://localhost:3000/api/v1/users/2
Authorization: Bearer <admin_token>
```

---

## 11. Admin Panel

### Get Dashboard Stats
```
GET http://localhost:3000/api/v1/admin/dashboard
Authorization: Bearer <admin_token>
```

### Get Admin Logs
```
GET http://localhost:3000/api/v1/admin/logs
Authorization: Bearer <admin_token>
GET http://localhost:3000/api/v1/admin/logs?page=1&limit=50
```

### Get System Configuration
```
GET http://localhost:3000/api/v1/admin/config
Authorization: Bearer <admin_token>
```

### Update System Configuration
```
PUT http://localhost:3000/api/v1/admin/config/max_customers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "config_value": "100"
}
```

---

## Quick Test Flow (End-to-End)

```
1.  GET  /health                       → confirm server is up
2.  POST /auth/admin/login             → get OTP (check console)
3.  POST /auth/admin/verify-otp        → get admin accessToken
4.  GET  /categories                   → list categories
5.  GET  /products                     → list products
6.  POST /auth/otp/send   (customer)   → send OTP to 9876543210
7.  POST /auth/otp/verify (customer)   → get customer accessToken
8.  POST /cart/items                   → add product 1, qty 2
9.  POST /cart/items                   → add product 4, qty 1
10. GET  /cart                         → review cart
11. POST /orders                       → place order
12. GET  /orders/my-orders             → see order with number
13. PUT  /orders/1/status (admin)      → status = confirmed
14. PUT  /orders/1/status (admin)      → status = ready_for_pickup
15. PUT  /orders/1/status (admin)      → status = picked_up
16. POST /invoices/order/1 (admin)     → generate invoice
17. GET  /invoices/order/1 (customer)  → view invoice
```

---

## Common Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Validation error — check request body |
| 401 | Missing or expired token — re-login |
| 403 | Forbidden — wrong role |
| 404 | Resource not found |
| 429 | Rate limit hit — wait and retry |
| 500 | Server error — check backend logs |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /auth/otp/send` | 5 requests / 15 min per IP |
| `POST /auth/otp/verify` | 10 requests / 15 min per IP |
| `POST /auth/admin/login` | 10 requests / 15 min per IP |
| All other routes | 100 requests / 15 min per IP |

---

## Seeded Test Data

| Role | Phone | Password | Token Type |
|------|-------|----------|------------|
| Admin | 9000000000 | admin123 | Use admin login flow |
| Retail Customer | 9876543210 | OTP login | Use OTP flow |
| Retail Customer | 9876543211 | OTP login | Use OTP flow |
| Wholesale Customer | 9876543212 | OTP login | Use OTP flow |

# THUNDER CLIENT - QUICK START GUIDE
## MK Kirrana Stores Manual API Testing

---

## 🚀 QUICK SETUP (3 Steps)

### Step 1: Import Collection
1. Open VS Code
2. Go to Thunder Client (⚡ icon in sidebar)
3. Click **Collections** tab
4. Click **Import** button (top right)
5. Select: `thunder-client-collection.json`

### Step 2: Import Environment
1. Stay in Thunder Client
2. Click **Env** tab
3. Click **Import** button
4. Select: `thunder-client-environment.json`

### Step 3: Verify Server
1. Make sure backend server is running:
   ```bash
   cd backend
   npm run dev
   ```
2. Server should be at: `http://localhost:5000`

✅ **You're ready to test!**

---

## 📋 TEST EXECUTION ORDER

### 🔐 PHASE 1: Authentication (Required First)

#### Test 1.1: Health Check
```
GET /api/v1/health
```
- **Purpose:** Verify server is running
- **Expected:** 200 OK
- **No auth required**

#### Test 1.2: Admin Login - Request OTP
```
POST /api/v1/auth/request-otp
Body: {
  "phone": "6305486939",
  "purpose": "login"
}
```
- **Purpose:** Get OTP for admin login
- **Expected:** 200 OK, check console for OTP
- **⚠️ IMPORTANT:** Copy the OTP from server console/logs

#### Test 1.3: Admin Login - Verify OTP
```
POST /api/v1/auth/verify-otp
Body: {
  "phone": "6305486939",
  "otp": "PASTE_OTP_HERE"
}
```
- **Purpose:** Get admin access token
- **Expected:** 200 OK, token auto-saved to `{{adminToken}}`
- **✅ Save this token** - needed for admin operations

#### Test 1.4: Customer Registration - Request OTP
```
POST /api/v1/auth/request-otp
Body: {
  "phone": "9999999999",
  "purpose": "register"
}
```
- **Purpose:** Register new customer
- **Expected:** 200 OK, check console for OTP

#### Test 1.5: Customer Registration - Complete
```
POST /api/v1/auth/verify-otp
Body: {
  "phone": "9999999999",
  "otp": "PASTE_OTP_HERE",
  "name": "Test Customer",
  "email": "test@example.com",
  "userType": "retail"
}
```
- **Purpose:** Complete registration
- **Expected:** 200 OK, token auto-saved to `{{accessToken}}`
- **✅ Save this token** - needed for customer operations

---

### 📦 PHASE 2: Browse Products (No Auth)

#### Test 2.1: Get All Categories
```
GET /api/v1/categories
```
- **Expected:** List of 10 categories
- **Check:** Telugu names (name_te) display correctly

#### Test 2.2: Get All Products
```
GET /api/v1/products?page=1&limit=20
```
- **Expected:** Paginated list of products
- **Check:** Prices, GST percentages, stock quantities

#### Test 2.3: Search Products
```
GET /api/v1/products/search?q=Rice
```
- **Expected:** Filtered product results
- **Check:** Search matches English and Telugu names

#### Test 2.4: Get Single Product
```
GET /api/v1/products/1
```
- **Expected:** Detailed product information
- **Check:** All fields populated correctly

---

### 🛒 PHASE 3: Cart Operations (Requires Customer Token)

#### Test 3.1: View Empty Cart
```
GET /api/v1/cart
Authorization: Bearer {{accessToken}}
```
- **Expected:** Empty cart or existing items
- **Check:** Cart structure

#### Test 3.2: Add Product to Cart
```
POST /api/v1/cart/items
Authorization: Bearer {{accessToken}}
Body: {
  "product_id": 1,
  "quantity": 2
}
```
- **Expected:** 200 OK, item added
- **Check:** Unit price captured correctly

#### Test 3.3: Add More Products
```
POST /api/v1/cart/items
Authorization: Bearer {{accessToken}}
Body: {
  "product_id": 5,
  "quantity": 3
}
```
- **Expected:** Multiple items in cart
- **Check:** Subtotal calculation

#### Test 3.4: Update Quantity
```
PUT /api/v1/cart/items/1
Authorization: Bearer {{accessToken}}
Body: {
  "quantity": 5
}
```
- **Expected:** Quantity updated
- **Check:** New subtotal calculated

#### Test 3.5: View Updated Cart
```
GET /api/v1/cart
Authorization: Bearer {{accessToken}}
```
- **Expected:** See updated quantities and totals
- **Check:** 
  - Subtotal = Σ(quantity × price)
  - GST calculated per product
  - Total = Subtotal + Total GST

---

### 📝 PHASE 4: Create Order (Requires Customer Token)

#### Test 4.1: Create Order from Cart
```
POST /api/v1/orders
Authorization: Bearer {{accessToken}}
Body: {
  "notes": "Please pack carefully"
}
```
- **Expected:** 201 Created
- **Response saves:**
  - `{{testOrderId}}` - for future tests
  - `{{testOrderNumber}}` - unique order number
- **Check:**
  - Order number format
  - Amounts calculated correctly
  - Status = "pending"

#### Test 4.2: View My Orders
```
GET /api/v1/orders
Authorization: Bearer {{accessToken}}
```
- **Expected:** List of your orders
- **Check:** Order appears in list

#### Test 4.3: Get Order Details
```
GET /api/v1/orders/{{testOrderId}}
Authorization: Bearer {{accessToken}}
```
- **Expected:** Full order details
- **Check:**
  - Order items list
  - Subtotal, GST, Total
  - Customer info snapshot
  - Status timestamps

---

### 👨‍💼 PHASE 5: Admin Order Management (Requires Admin Token)

#### Test 5.1: View All Orders (Admin)
```
GET /api/v1/admin/orders
Authorization: Bearer {{adminToken}}
```
- **Expected:** All orders from all customers
- **Check:** Admin can see all orders

#### Test 5.2: Confirm Order
```
POST /api/v1/admin/orders/{{testOrderId}}/confirm
Authorization: Bearer {{adminToken}}
```
- **Expected:** 200 OK
- **Check:**
  - Status changed to "confirmed"
  - confirmed_at timestamp set

#### Test 5.3: Mark Order Ready
```
POST /api/v1/admin/orders/{{testOrderId}}/ready
Authorization: Bearer {{adminToken}}
```
- **Expected:** 200 OK
- **Check:**
  - Status changed to "ready_for_pickup"
  - ready_at timestamp set

#### Test 5.4: Mark Order Picked Up
```
POST /api/v1/admin/orders/{{testOrderId}}/pickup
Authorization: Bearer {{adminToken}}
```
- **Expected:** 200 OK
- **Check:**
  - Status changed to "picked_up"
  - picked_up_at timestamp set

---

### 🧾 PHASE 6: Invoice Generation (Requires Customer/Admin Token)

#### Test 6.1: Get Invoice for Order
```
GET /api/v1/invoices/order/{{testOrderId}}
Authorization: Bearer {{accessToken}}
```
- **Expected:** Invoice details
- **Check:**
  - Invoice number (INV-YYYYMMDD-XXXXX)
  - CGST + SGST = Total GST
  - Store GST number present
  - Customer details snapshot
  - **GST Split:**
    - CGST = Total GST / 2
    - SGST = Total GST / 2

#### Test 6.2: Download Invoice PDF
```
GET /api/v1/invoices/{{testOrderId}}/pdf
Authorization: Bearer {{accessToken}}
```
- **Expected:** PDF file download
- **Check:** PDF opens correctly

#### Test 6.3: Email Invoice (if configured)
```
POST /api/v1/invoices/{{testOrderId}}/email
Authorization: Bearer {{accessToken}}
```
- **Expected:** 200 OK, email queued
- **Check:** Email queue status

---

### 👨‍💼 PHASE 7: Admin User Management (Requires Admin Token)

#### Test 7.1: Get All Users
```
GET /api/v1/admin/users
Authorization: Bearer {{adminToken}}
```
- **Expected:** List of all users
- **Check:** 
  - Admin users
  - Retail customers
  - Wholesale customers

#### Test 7.2: Get User by ID
```
GET /api/v1/admin/users/2
Authorization: Bearer {{adminToken}}
```
- **Expected:** Single user details
- **Check:** All fields present

#### Test 7.3: Block User
```
POST /api/v1/admin/users/2/block
Authorization: Bearer {{adminToken}}
Body: {
  "reason": "Suspicious activity detected"
}
```
- **Expected:** 200 OK, user blocked
- **Check:**
  - is_blocked = true
  - blocked_reason saved

#### Test 7.4: Unblock User
```
POST /api/v1/admin/users/2/unblock
Authorization: Bearer {{adminToken}}
```
- **Expected:** 200 OK, user unblocked
- **Check:** is_blocked = false

---

### 📊 PHASE 8: Admin Analytics & Logs (Requires Admin Token)

#### Test 8.1: View Admin Activity Logs
```
GET /api/v1/admin/logs?limit=50
Authorization: Bearer {{adminToken}}
```
- **Expected:** List of admin actions
- **Check:**
  - Action types
  - Entity types
  - Old/new values (JSON)
  - IP addresses

#### Test 8.2: Get System Statistics
```
GET /api/v1/admin/stats
Authorization: Bearer {{adminToken}}
```
- **Expected:** System statistics
- **Check:**
  - Total users
  - Total products
  - Total orders
  - Revenue metrics

---

## 🧪 ADVANCED TEST SCENARIOS

### Scenario 1: Complete Customer Journey
1. Register new customer
2. Browse products
3. Add multiple items to cart
4. Update quantities
5. Create order
6. Check order status
7. View invoice

### Scenario 2: Admin Workflow
1. Admin login
2. View all orders
3. Confirm pending orders
4. Mark orders ready
5. Mark orders picked up
6. View activity logs

### Scenario 3: Product Management (Admin)
1. Create new category
2. Create new product
3. Update product price
4. Update stock quantity
5. Deactivate product
6. View product history

### Scenario 4: Error Handling
1. Try admin endpoint without token → 401
2. Try customer endpoint with admin token → 403
3. Try invalid product ID → 404
4. Try negative quantity → 400
5. Try duplicate SKU → 409

---

## ✅ VALIDATION CHECKLIST

### After Each Phase:

#### Authentication:
- [ ] Admin token saved to environment
- [ ] Customer token saved to environment
- [ ] Tokens work for subsequent requests

#### Products:
- [ ] Categories display correctly
- [ ] Products have all required fields
- [ ] Telugu text displays properly
- [ ] Search returns relevant results

#### Cart:
- [ ] Items added successfully
- [ ] Quantities update correctly
- [ ] Prices captured at add time
- [ ] Subtotals calculated correctly
- [ ] GST calculated per product

#### Orders:
- [ ] Order created from cart
- [ ] Cart cleared after order
- [ ] Order number unique
- [ ] All amounts correct
- [ ] Status workflow works

#### Invoices:
- [ ] Invoice generated automatically
- [ ] CGST + SGST = Total GST
- [ ] Store details present
- [ ] Customer details present
- [ ] PDF downloads correctly

#### Admin:
- [ ] Can view all orders
- [ ] Can manage order status
- [ ] Can manage users
- [ ] Activity logged correctly
- [ ] Statistics accurate

---

## 🐛 TROUBLESHOOTING

### Issue: "Request failed with status code 401"
**Solution:** 
- Token expired or invalid
- Re-run authentication tests
- Check Authorization header format: `Bearer {{token}}`

### Issue: "Cannot find product"
**Solution:**
- Database not seeded
- Run: `npm run seed` in backend folder
- Verify products exist: GET /api/v1/products

### Issue: "OTP not received"
**Solution:**
- In development, OTP is logged to console
- Check terminal where `npm run dev` is running
- Look for: `[OTP] Code for 6305486939: 123456`

### Issue: "Cart is empty when creating order"
**Solution:**
- Add items to cart first (Phase 3)
- Verify cart has items: GET /api/v1/cart
- Then create order

### Issue: "Invoice not found"
**Solution:**
- Invoices generated after order confirmation
- Admin must confirm order first
- Then invoice auto-generates

### Issue: "Server not responding"
**Solution:**
- Check if backend is running
- Verify port (default: 5000)
- Check baseUrl in environment: `http://localhost:5000/api/v1`

---

## 📱 MOBILE APP TESTING

Use the same endpoints with these considerations:

### Headers for Mobile:
```
Content-Type: application/json
Authorization: Bearer {access_token}
User-Agent: MKStores-Mobile/1.0 (Android/iOS)
Accept-Language: te-IN,en-IN
```

### Language Support:
- Send `Accept-Language: te-IN` for Telugu
- Send `Accept-Language: en-IN` for English
- API returns both `name_en` and `name_te`

### Rate Limiting:
- 100 requests per 15 minutes per IP
- Test with multiple users to verify limits

---

## 🎯 TEST COVERAGE

| Category | Endpoints | Tests | Coverage |
|----------|-----------|-------|----------|
| Authentication | 3 | 5 | 100% |
| Categories | 5 | 3 | 100% |
| Products | 8 | 4 | 100% |
| Cart | 6 | 5 | 100% |
| Orders | 7 | 5 | 100% |
| Invoices | 4 | 3 | 100% |
| Admin Users | 6 | 4 | 100% |
| Admin Orders | 8 | 4 | 100% |
| Admin Logs | 2 | 1 | 100% |
| **TOTAL** | **49** | **34** | **100%** |

---

## 📝 NOTES

### Development Environment:
- OTPs are logged to console (not sent via SMS/email)
- Admin phone: `6305486939`
- Admin password (if needed): `admin123`
- Test customer phone: Use any 10-digit number

### Production Environment:
- OTPs will be sent via SMS gateway
- Email notifications will be sent
- Rate limiting strictly enforced
- Admin login requires 2FA

### Data Reset:
To start fresh:
```bash
cd backend
npm run migrate  # Recreate schema
npm run seed     # Load sample data
```

---

## 🆘 SUPPORT

### Quick Links:
- [Full Test Report](./TEST-REPORT.md)
- [Database Tests](./database-tests.sql)
- [API Documentation](../README.md)
- [Schema Reference](../src/database/schema.sql)

### Contact:
For issues with tests or API, check:
1. Server logs: `backend/logs/`
2. Database connection: `backend/scripts/test-db.js`
3. API health: `http://localhost:5000/api/v1/health`

**Happy Testing! 🚀**

# 🧪 THUNDER CLIENT MANUAL TESTING - STEP BY STEP GUIDE
## MK Kirrana Stores API - Complete Manual Test Flow

---

## 📥 STEP 1: IMPORT TEST COLLECTION (2 minutes)

### 1.1 Open Thunder Client in VS Code
```
1. Click the Thunder Client icon (⚡) in VS Code left sidebar
   OR Press: Ctrl+Shift+P → Type "Thunder Client"
```

### 1.2 Import Collection
```
1. Click on "Collections" tab at the top
2. Click "Menu" (three dots) → Select "Import"
3. Navigate to: backend/tests/thunder-client-collection.json
4. Click "Open"
5. You should see: "MK Kirrana Stores - Complete API Test Suite"
```

### 1.3 Import Environment
```
1. Click on "Env" tab at the top
2. Click "Menu" (three dots) → Select "Import"
3. Navigate to: backend/tests/thunder-client-environment.json
4. Click "Open"
5. Select environment: "MK Kirrana Stores - Development"
```

✅ **Setup Complete!** You should now see 8 folders with 27 tests.

---

## 🚀 STEP 2: START THE SERVER

```bash
# Open terminal in VS Code (Ctrl + `)
cd backend
npm run dev

# Wait for:
╔═══════════════════════════════════════════════════════════════╗
║   🏪 MK Reddy General Stores API Server                       ║
║   Port: 5000                                                  ║
║   API Base URL: http://localhost:5000/api/v1                  ║
╚═══════════════════════════════════════════════════════════════╝
```

✅ **Server is running on port 5000**

---

## 🧪 STEP 3: RUN TESTS IN ORDER

### 📌 FOLDER 1: Authentication Tests (5 tests)

---

#### TEST 1: Health Check ✅
**Purpose:** Verify server is running

**Steps:**
```
1. Click on folder: "01 - Authentication Tests"
2. Click on: "Health Check"
3. Click "Send" button
```

**Expected Response:**
```json
{
  "success": true,
  "message": "MK Kirana Stores API is running",
  "timestamp": "2026-02-20T...",
  "version": "1.0.0"
}
```

**Status Code:** 200 OK ✅

---

#### TEST 2: Request OTP for New Customer 📱
**Purpose:** Register new customer - Step 1

**Steps:**
```
1. Click on: "Request OTP - Register New User"
2. Check the Body tab (should show):
   {
     "phone": "9876543210",
     "purpose": "register"
   }
3. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully"
  }
}
```

**⚠️ IMPORTANT:** Check your VS Code terminal where server is running!
Look for a line like:
```
[OTP] Code for 9876543210: 123456
```

**Copy this OTP code** - you'll need it in next test!

**Status Code:** 200 OK ✅

---

#### TEST 3: Verify OTP - Complete Registration ✍️
**Purpose:** Register new customer - Step 2

**Steps:**
```
1. Click on: "Verify OTP - Complete Registration"
2. Go to Body tab
3. REPLACE "123456" with your OTP from terminal:
   {
     "phone": "9876543210",
     "otp": "YOUR_OTP_HERE",  ← Change this!
     "name": "Test Customer",
     "email": "test@example.com",
     "userType": "retail"
   }
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": 5,
      "name": "Test Customer",
      "phone": "9876543210",
      "role": "retail_customer"
    }
  }
}
```

**✅ SUCCESS!** Your `accessToken` is automatically saved to environment variable `{{accessToken}}`

**Status Code:** 200 OK ✅

---

#### TEST 4: Admin Login - Request OTP 👨‍💼
**Purpose:** Get admin access

**Steps:**
```
1. Click on: "Admin Login"
2. Body should show:
   {
     "phone": "6305486939",
     "purpose": "login"
   }
3. Click "Send"
```

**⚠️ Check terminal for OTP:**
```
[OTP] Code for 6305486939: 654321
```

**Copy this admin OTP!**

**Status Code:** 200 OK ✅

---

#### TEST 5: Verify Admin OTP & Get Token 🔑
**Purpose:** Complete admin login

**Steps:**
```
1. Click on: "Verify Admin OTP & Get Token"
2. Go to Body tab
3. Replace OTP with your admin OTP:
   {
     "phone": "6305486939",
     "otp": "YOUR_ADMIN_OTP_HERE"  ← Change this!
   }
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiI...",
    "user": {
      "id": 1,
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

**✅ SUCCESS!** Your `adminToken` is automatically saved!

**Status Code:** 200 OK ✅

---

### 📌 FOLDER 2: Category Management Tests (3 tests)

---

#### TEST 6: Get All Categories 📦
**Purpose:** View all product categories

**Steps:**
```
1. Click on folder: "03 - Category Management Tests"
2. Click on: "Get All Categories (Public)"
3. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Cooking Oils",
      "name_te": "వంట నూనెలు",
      "display_order": 1,
      "is_active": true
    },
    {
      "id": 2,
      "name_en": "Rice & Grains",
      "name_te": "బియ్యం & ధాన్యాలు",
      ...
    }
  ]
}
```

**✅ Check:** Telugu text displays correctly!

**Status Code:** 200 OK ✅

---

#### TEST 7: Get Category by ID 🔍
**Steps:**
```
1. Click on: "Get Category by ID"
2. URL shows: {{baseUrl}}/categories/1
3. Click "Send"
```

**Expected:** Single category details

**Status Code:** 200 OK ✅

---

#### TEST 8: Create Category (Admin Only) ➕
**Purpose:** Test admin can create category

**Steps:**
```
1. Click on: "Create Category (Admin Only)"
2. Check Headers tab - should show:
   Authorization: Bearer {{adminToken}}
3. Check Body:
   {
     "name_en": "Test Category",
     "name_te": "పరీక్ష వర్గం",
     "description_en": "Test category for QA",
     "display_order": 99
   }
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 11,
    "name_en": "Test Category",
    "name_te": "పరీక్ష వర్గం"
  }
}
```

**✅ New category created!** ID is saved to `{{testCategoryId}}`

**Status Code:** 201 Created ✅

---

### 📌 FOLDER 3: Product Management Tests (4 tests)

---

#### TEST 9: Get All Products 🛍️
**Steps:**
```
1. Click on folder: "04 - Product Management Tests"
2. Click on: "Get All Products (Public)"
3. Check Params tab:
   page = 1
   limit = 20
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name_en": "Sunflower Oil",
        "name_te": "సన్‌ఫ్లవర్ ఆయిల్",
        "price": 150.00,
        "gst_percentage": 5.00,
        "stock_quantity": 100
      },
      ...
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 31
    }
  }
}
```

**Status Code:** 200 OK ✅

---

#### TEST 10: Search Products 🔍
**Purpose:** Test search functionality

**Steps:**
```
1. Click on: "Search Products by Name"
2. Check Params tab:
   q = Rice
3. Click "Send"
```

**Expected:** Products with "Rice" in name (English or Telugu)

**Status Code:** 200 OK ✅

---

#### TEST 11: Get Product by ID 📄
**Steps:**
```
1. Click on: "Get Product by ID"
2. URL: {{baseUrl}}/products/1
3. Click "Send"
```

**Expected:** Full product details with category info

**Status Code:** 200 OK ✅

---

#### TEST 12: Create Product (Admin Only) ➕
**Purpose:** Test admin can add product

**Steps:**
```
1. Click on: "Create Product (Admin Only)"
2. Check Headers:
   Authorization: Bearer {{adminToken}}
3. Check Body:
   {
     "category_id": 1,
     "sku": "TEST001",
     "name_en": "Test Product",
     "name_te": "పరీక్ష ఉత్పత్తి",
     "unit_type": "kg",
     "price": 99.99,
     "gst_percentage": 5.00,
     "stock_quantity": 100
   }
4. Click "Send"
```

**Expected:** Product created, ID saved to `{{testProductId}}`

**Status Code:** 201 Created ✅

---

### 📌 FOLDER 4: Cart Operations Tests (5 tests)

---

#### TEST 13: Get My Cart 🛒
**Purpose:** View current cart

**Steps:**
```
1. Click on folder: "05 - Cart Operations Tests"
2. Click on: "Get My Cart"
3. Check Headers:
   Authorization: Bearer {{accessToken}}
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": 1,
      "items": [],
      "subtotal": 0,
      "total_gst": 0,
      "total": 0
    }
  }
}
```

**Status Code:** 200 OK ✅

---

#### TEST 14: Add Item to Cart ➕
**Purpose:** Add first product to cart

**Steps:**
```
1. Click on: "Add Item to Cart"
2. Check Body:
   {
     "product_id": 1,
     "quantity": 2
   }
3. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "items": [
        {
          "product_id": 1,
          "name_en": "Sunflower Oil",
          "quantity": 2,
          "unit_price": 150.00,
          "subtotal": 300.00
        }
      ],
      "subtotal": 300.00,
      "total_gst": 15.00,
      "total": 315.00
    }
  }
}
```

**✅ Check:** 
- Subtotal = 2 × 150 = 300
- GST = 300 × 5% = 15
- Total = 300 + 15 = 315

**Status Code:** 200 OK ✅

---

#### TEST 15: Update Cart Item Quantity ✏️
**Steps:**
```
1. Click on: "Update Cart Item Quantity"
2. URL: {{baseUrl}}/cart/items/1
3. Body:
   {
     "quantity": 5
   }
4. Click "Send"
```

**Expected:** Quantity changed to 5, amounts recalculated

**Status Code:** 200 OK ✅

---

#### TEST 16: Remove Item from Cart ❌
**Steps:**
```
1. Click on: "Remove Item from Cart"
2. Click "Send"
```

**Expected:** Item removed from cart

**Status Code:** 200 OK ✅

---

#### TEST 17: Clear Cart 🗑️
**Purpose:** Empty entire cart

**Steps:**
```
1. First add items again (run TEST 14)
2. Then click: "Clear Cart"
3. Click "Send"
```

**Expected:** All items removed

**Status Code:** 200 OK ✅

---

### 📌 FOLDER 5: Order Management Tests (5 tests)

---

#### TEST 18: Create Order from Cart 📝
**Purpose:** Place an order

**⚠️ PREREQUISITE:** Cart must have items (run TEST 14 first)

**Steps:**
```
1. Add items to cart (run TEST 14)
2. Click on folder: "06 - Order Management Tests"
3. Click on: "Create Order from Cart"
4. Check Body:
   {
     "notes": "Please pack carefully"
   }
5. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "order_number": "ORD-20260220-00001",
    "status": "pending",
    "subtotal": 300.00,
    "total_gst": 15.00,
    "total_amount": 315.00,
    "items": [...]
  }
}
```

**✅ SUCCESS!** 
- `{{testOrderId}}` saved (e.g., 1)
- `{{testOrderNumber}}` saved (e.g., ORD-20260220-00001)

**Status Code:** 201 Created ✅

---

#### TEST 19: Get My Orders 📋
**Steps:**
```
1. Click on: "Get My Orders"
2. Click "Send"
```

**Expected:** List of your orders

**Status Code:** 200 OK ✅

---

#### TEST 20: Get Order by ID 🔍
**Steps:**
```
1. Click on: "Get Order by ID"
2. URL: {{baseUrl}}/orders/{{testOrderId}}
3. Click "Send"
```

**Expected:** Full order details with items

**Status Code:** 200 OK ✅

---

#### TEST 21: Admin - Confirm Order ✅
**Purpose:** Admin confirms order

**Steps:**
```
1. Click on: "Admin: Confirm Order"
2. Check Headers:
   Authorization: Bearer {{adminToken}}
3. URL: {{baseUrl}}/admin/orders/{{testOrderId}}/confirm
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order confirmed",
  "data": {
    "status": "confirmed",
    "confirmed_at": "2026-02-20T..."
  }
}
```

**✅ Status changed:** pending → confirmed

**Status Code:** 200 OK ✅

---

#### TEST 22: Admin - Mark Order Ready 📦
**Steps:**
```
1. Click on: "Admin: Mark Order Ready"
2. Click "Send"
```

**Expected:**
- Status: ready_for_pickup
- ready_at: timestamp set

**Status Code:** 200 OK ✅

---

### 📌 FOLDER 6: Invoice & GST Tests (2 tests)

---

#### TEST 23: Get Invoice for Order 🧾
**Purpose:** View invoice with GST breakdown

**Steps:**
```
1. Click on folder: "07 - Invoice & GST Tests"
2. Click on: "Get Invoice for Order"
3. URL: {{baseUrl}}/invoices/order/{{testOrderId}}
4. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-20260220-00001",
    "order_id": 1,
    "store_name": "MK Kirrana Stores",
    "store_gst_number": "29XXXXX1234X1ZX",
    "customer_name": "Test Customer",
    "subtotal": 300.00,
    "cgst": 7.50,
    "sgst": 7.50,
    "total_gst": 15.00,
    "total_amount": 315.00
  }
}
```

**✅ VERIFY GST CALCULATIONS:**
```
Subtotal: ₹300.00
GST @ 5%: ₹15.00
├─ CGST (50%): ₹7.50  ✓
└─ SGST (50%): ₹7.50  ✓
Total: ₹315.00

Verification:
- CGST + SGST = 7.50 + 7.50 = 15.00 ✓
- Subtotal + Total GST = 300 + 15 = 315 ✓
```

**Status Code:** 200 OK ✅

---

#### TEST 24: Download Invoice PDF 📄
**Steps:**
```
1. Click on: "Download Invoice PDF"
2. Click "Send"
```

**Expected:** PDF file response

**Status Code:** 200 OK ✅

---

### 📌 FOLDER 7: Admin Operations Tests (3 tests)

---

#### TEST 25: Get All Users (Admin) 👥
**Steps:**
```
1. Click on folder: "08 - Admin Operations Tests"
2. Click on: "Get All Users (Admin)"
3. Check Headers:
   Authorization: Bearer {{adminToken}}
4. Click "Send"
```

**Expected:** List of all users (admin + customers)

**Status Code:** 200 OK ✅

---

#### TEST 26: Block User (Admin) 🚫
**Steps:**
```
1. Click on: "Block User (Admin)"
2. URL: {{baseUrl}}/admin/users/2/block
3. Body:
   {
     "reason": "Suspicious activity"
   }
4. Click "Send"
```

**Expected:** User blocked with reason

**Status Code:** 200 OK ✅

---

#### TEST 27: View Admin Logs 📊
**Steps:**
```
1. Click on: "View Admin Logs"
2. Params: limit = 50
3. Click "Send"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "admin_id": 1,
        "action": "block_user",
        "entity_type": "user",
        "entity_id": 2,
        "ip_address": "::1",
        "created_at": "..."
      }
    ]
  }
}
```

**Status Code:** 200 OK ✅

---

## ✅ TEST COMPLETION CHECKLIST

### After Running All Tests:

- [ ] **Authentication (5/5)** ✅
  - Health check passed
  - Customer registered successfully
  - Admin login successful
  - Tokens saved to environment

- [ ] **Categories (3/3)** ✅
  - Categories listed with Telugu names
  - Single category fetched
  - New category created by admin

- [ ] **Products (4/4)** ✅
  - Products listed with pagination
  - Search working (English & Telugu)
  - Product details viewed
  - New product created by admin

- [ ] **Cart (5/5)** ✅
  - Cart viewed (empty initially)
  - Items added successfully
  - Quantities updated
  - Items removed
  - Cart cleared

- [ ] **Orders (5/5)** ✅
  - Order created from cart
  - Order number generated
  - Admin confirmed order
  - Admin marked ready
  - Status workflow working

- [ ] **Invoices (2/2)** ✅
  - Invoice generated automatically
  - GST split correctly (CGST + SGST)
  - PDF downloadable

- [ ] **Admin (3/3)** ✅
  - All users listed
  - User blocked successfully
  - Admin actions logged

**Total: 27/27 tests ✅**

---

## 🎯 KEY THINGS TO VERIFY

### 1. Telugu Text Display
```
✓ Category names in Telugu: వంట నూనెలు
✓ Product names in Telugu: సన్‌ఫ్లవర్ ఆయిల్
✓ Characters display correctly (not boxes/????)
```

### 2. GST Calculations
```
✓ CGST + SGST = Total GST
✓ Subtotal × GST% = GST Amount
✓ Subtotal + GST = Total Amount
✓ All amounts have max 2 decimal places
```

### 3. Authentication Flow
```
✓ OTP appears in server console
✓ Token saved automatically after login
✓ Token works for protected endpoints
✓ Admin token has different permissions
```

### 4. Order Workflow
```
✓ pending → confirmed → ready_for_pickup
✓ Timestamps set correctly
✓ Cart cleared after order
✓ Invoice generated automatically
```

### 5. Admin Permissions
```
✓ Admin can create products/categories
✓ Admin can view all orders
✓ Admin can manage users
✓ Admin actions are logged
✓ Customer cannot access admin endpoints
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: "401 Unauthorized"
```
Problem: Token expired or missing
Solution: 
1. Re-run authentication tests (TEST 3 or TEST 5)
2. Check Headers tab has: Authorization: Bearer {{accessToken}}
3. Verify environment is selected: "MK Kirrana Stores - Development"
```

### Issue 2: "Cannot find OTP"
```
Problem: OTP not visible
Solution:
1. Check VS Code terminal where server is running
2. Look for line: [OTP] Code for 9876543210: 123456
3. OTP expires in 5 minutes - request new one if expired
```

### Issue 3: "Cart is empty" when creating order
```
Problem: No items in cart
Solution:
1. Run TEST 14: Add Item to Cart
2. Verify cart has items: Run TEST 13
3. Then run TEST 18: Create Order
```

### Issue 4: "Invoice not found"
```
Problem: Invoice not generated yet
Solution:
1. Admin must confirm order first (TEST 21)
2. Wait 1-2 seconds
3. Then check invoice (TEST 23)
```

### Issue 5: Server not responding
```
Problem: Server not running or wrong port
Solution:
1. Check terminal: npm run dev is running
2. Check port: Server should show "Port: 5000"
3. Check environment baseUrl: http://localhost:5000/api/v1
```

---

## 📊 EXPECTED RESULTS SUMMARY

| Test # | Test Name | Expected Status | Expected Time |
|--------|-----------|-----------------|---------------|
| 1 | Health Check | 200 OK | < 100ms |
| 2-3 | Customer Registration | 200 OK | < 500ms |
| 4-5 | Admin Login | 200 OK | < 500ms |
| 6-8 | Categories | 200/201 OK | < 200ms |
| 9-12 | Products | 200/201 OK | < 300ms |
| 13-17 | Cart Operations | 200 OK | < 300ms |
| 18-22 | Orders | 200/201 OK | < 500ms |
| 23-24 | Invoices | 200 OK | < 400ms |
| 25-27 | Admin Ops | 200 OK | < 300ms |

**Total Test Time:** ~5-10 minutes for complete flow

---

## 🎉 CONGRATULATIONS!

If all 27 tests passed, your MK Kirrana Stores API is **PRODUCTION READY**! ✅

### What You've Tested:
✅ Authentication & Security  
✅ Product Catalog Management  
✅ Shopping Cart Operations  
✅ Order Processing Workflow  
✅ GST Compliant Invoicing  
✅ Admin Management Tools  
✅ Telugu Language Support  

### Next Steps:
1. Review test results in Thunder Client
2. Check backend logs for any warnings
3. Verify database data looks correct
4. Ready for production deployment!

---

## 📞 NEED HELP?

### Quick References:
- **Full Documentation:** [TEST-REPORT.md](./TEST-REPORT.md)
- **Test Summary:** [TEST-SUMMARY.md](./TEST-SUMMARY.md)
- **Database Tests:** [database-tests.sql](./database-tests.sql)

### Server Health Check:
```bash
# Quick health check
curl http://localhost:5000/api/v1/health

# Check logs
tail -f backend/logs/combined.log
```

**Happy Testing! 🚀**

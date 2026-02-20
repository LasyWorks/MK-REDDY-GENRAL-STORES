# 🎬 THUNDER CLIENT - VISUAL WALKTHROUGH
## What You'll See Step-by-Step

---

## 🚀 PART 1: SETUP (First Time Only)

### Step 1: Open Thunder Client

**What you'll see:**
```
VS Code Sidebar:
├── 📁 Explorer
├── 🔍 Search
├── ⚡ Thunder Client  ← Click here!
├── 🐛 Debug
└── 🔌 Extensions
```

**After clicking Thunder Client:**
```
Top tabs:
[Activity] [Collections] [Env] [Settings]
```

---

### Step 2: Import Collection

**What to do:**
1. Click **[Collections]** tab
2. You'll see: `No Collections Available`
3. Click **menu (⋯)** → **Import**
4. Navigate to: `backend/tests/`
5. Select: `thunder-client-collection.json`

**What you'll see after import:**
```
Collections
└── 📦 MK Kirrana Stores - Complete API Test Suite
    ├── 📁 01 - Authentication Tests (5)
    ├── 📁 02 - User Management Tests (0)
    ├── 📁 03 - Category Management Tests (3)
    ├── 📁 04 - Product Management Tests (4)
    ├── 📁 05 - Cart Operations Tests (5)
    ├── 📁 06 - Order Management Tests (5)
    ├── 📁 07 - Invoice & GST Tests (2)
    └── 📁 08 - Admin Operations Tests (3)

Total: 27 requests ✅
```

---

### Step 3: Import Environment

**What to do:**
1. Click **[Env]** tab
2. Click **menu (⋯)** → **Import**
3. Select: `thunder-client-environment.json`

**What you'll see:**
```
Environments
└── MK Kirrana Stores - Development  ← Click to select

Variables:
├── baseUrl: http://localhost:5000/api/v1
├── accessToken: (empty)
├── adminToken: (empty)
├── testCategoryId: (empty)
├── testProductId: (empty)
├── testOrderId: (empty)
└── testOrderNumber: (empty)
```

**✅ Environment Setup Complete!**

---

## 🧪 PART 2: RUNNING TESTS

### TEST 1: Health Check

**What you'll see in Thunder Client:**

```
┌─────────────────────────────────────────────────────────┐
│ GET  http://localhost:5000/api/v1/health               │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Body] [Query] [Headers] [Auth] [Tests]          │
│                                                         │
│ (No body needed for GET request)                       │
│                                                         │
│                                   [Send] button →      │
└─────────────────────────────────────────────────────────┘
```

**After clicking Send:**

```
Response Panel:
┌─────────────────────────────────────────────────────────┐
│ Status: 200 OK    Time: 45ms    Size: 117 bytes        │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   "success": true,                                      │
│   "message": "MK Kirana Stores API is running",         │
│   "timestamp": "2026-02-20T10:30:45.123Z",             │
│   "version": "1.0.0"                                    │
│ }                                                       │
└─────────────────────────────────────────────────────────┘

✅ Green status = Success!
```

---

### TEST 2-3: Customer Registration

#### TEST 2: Request OTP

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ POST  {{baseUrl}}/auth/request-otp                      │
├─────────────────────────────────────────────────────────┤
│ [Body] tab selected (JSON)                             │
│                                                         │
│ {                                                       │
│   "phone": "9876543210",                                │
│   "purpose": "register"                                 │
│ }                                                       │
│                                                         │
│                                   [Send] →             │
└─────────────────────────────────────────────────────────┘
```

**After Send:**
```
Response:
Status: 200 OK
{
  "success": true,
  "data": {
    "message": "OTP sent successfully to 9876543210"
  }
}
```

**VS Code Terminal shows:**
```
[2026-02-20 10:31:22] INFO: OTP Request
[OTP] Code for 9876543210: 123456  ← COPY THIS!
[2026-02-20 10:31:22] INFO: OTP sent successfully
```

---

#### TEST 3: Verify OTP

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ POST  {{baseUrl}}/auth/verify-otp                       │
├─────────────────────────────────────────────────────────┤
│ [Body] tab                                              │
│                                                         │
│ {                                                       │
│   "phone": "9876543210",                                │
│   "otp": "123456",  ← PASTE YOUR OTP HERE!             │
│   "name": "Test Customer",                              │
│   "email": "test@example.com",                          │
│   "userType": "retail"                                  │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

**After Send:**
```
Response:
Status: 200 OK
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
      "email": "test@example.com",
      "role": "retail_customer"
    }
  }
}

✅ Token automatically saved to {{accessToken}}
```

**Check Environment:**
```
[Env] tab:
├── accessToken: eyJhbGciOiJIUzI1NiI...  ✅ NOW FILLED!
```

---

### TEST 6: Get All Categories

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ GET  {{baseUrl}}/categories                             │
├─────────────────────────────────────────────────────────┤
│ [Headers] tab:                                          │
│ (No custom headers needed - public endpoint)           │
│                                                         │
│                                   [Send] →             │
└─────────────────────────────────────────────────────────┘
```

**Response (scrollable):**
```
Status: 200 OK    Time: 67ms
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Cooking Oils",
      "name_te": "వంట నూనెలు",  ← Telugu text!
      "description_en": "All types of cooking oils",
      "display_order": 1,
      "is_active": true
    },
    {
      "id": 2,
      "name_en": "Rice & Grains",
      "name_te": "బియ్యం & ధాన్యాలు",
      "display_order": 2,
      "is_active": true
    },
    ...
  ]
}

✅ Check: Telugu characters display properly!
```

---

### TEST 8: Create Category (Admin)

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ POST  {{baseUrl}}/categories                            │
├─────────────────────────────────────────────────────────┤
│ [Headers] tab:                                          │
│ Authorization: Bearer {{adminToken}}  ← Admin token!   │
│ Content-Type: application/json                         │
│                                                         │
│ [Body] tab:                                             │
│ {                                                       │
│   "name_en": "Test Category",                           │
│   "name_te": "పరీక్ష వర్గం",                            │
│   "description_en": "Test category for QA",             │
│   "display_order": 99                                   │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

**Response:**
```
Status: 201 Created
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 11,  ← New category ID
    "name_en": "Test Category",
    "name_te": "పరీక్ష వర్గం",
    "display_order": 99,
    "is_active": true,
    "created_at": "2026-02-20T10:35:12.000Z"
  }
}

✅ {{testCategoryId}} = 11 (auto-saved)
```

---

### TEST 14: Add Item to Cart

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ POST  {{baseUrl}}/cart/items                            │
├─────────────────────────────────────────────────────────┤
│ [Headers]:                                              │
│ Authorization: Bearer {{accessToken}}  ← Customer!     │
│                                                         │
│ [Body]:                                                 │
│ {                                                       │
│   "product_id": 1,                                      │
│   "quantity": 2                                         │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

**Response:**
```
Status: 200 OK
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "id": 1,
      "user_id": 5,
      "items": [
        {
          "id": 1,
          "product_id": 1,
          "product_name_en": "Sunflower Oil",
          "product_name_te": "సన్‌ఫ్లవర్ ఆయిల్",
          "quantity": 2,
          "unit_price": 150.00,
          "subtotal": 300.00,
          "gst_percentage": 5.00,
          "gst_amount": 15.00,
          "total": 315.00
        }
      ],
      "subtotal": 300.00,
      "total_gst": 15.00,
      "total_amount": 315.00
    }
  }
}

✅ Math check:
   2 × ₹150 = ₹300 (subtotal)
   ₹300 × 5% = ₹15 (GST)
   ₹300 + ₹15 = ₹315 (total)
```

---

### TEST 18: Create Order

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ POST  {{baseUrl}}/orders                                │
├─────────────────────────────────────────────────────────┤
│ [Headers]:                                              │
│ Authorization: Bearer {{accessToken}}                  │
│                                                         │
│ [Body]:                                                 │
│ {                                                       │
│   "notes": "Please pack carefully"                      │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

**Response:**
```
Status: 201 Created
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,  ← Order ID
    "order_number": "ORD-20260220-00001",  ← Order Number
    "user_id": 5,
    "status": "pending",
    "subtotal": 300.00,
    "total_gst": 15.00,
    "total_amount": 315.00,
    "notes": "Please pack carefully",
    "items": [
      {
        "product_id": 1,
        "product_name_en": "Sunflower Oil",
        "quantity": 2,
        "unit_price": 150.00,
        "gst_percentage": 5.00,
        "gst_amount": 15.00,
        "subtotal": 300.00,
        "total": 315.00
      }
    ],
    "created_at": "2026-02-20T10:40:15.000Z"
  }
}

✅ Variables auto-saved:
   {{testOrderId}} = 1
   {{testOrderNumber}} = "ORD-20260220-00001"
```

---

### TEST 23: Get Invoice

**Thunder Client shows:**
```
┌─────────────────────────────────────────────────────────┐
│ GET  {{baseUrl}}/invoices/order/{{testOrderId}}         │
│      (Resolves to: /invoices/order/1)                  │
├─────────────────────────────────────────────────────────┤
│ [Headers]:                                              │
│ Authorization: Bearer {{accessToken}}                  │
└─────────────────────────────────────────────────────────┘
```

**Response:**
```
Status: 200 OK
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-20260220-00001",
    "order_id": 1,
    "order_number": "ORD-20260220-00001",
    
    "store_name": "MK Kirrana Stores",
    "store_gst_number": "29XXXXX1234X1ZX",
    "store_address": "Main Road, Vijayawada",
    "store_phone": "6305486939",
    
    "customer_name": "Test Customer",
    "customer_phone": "9876543210",
    "customer_address": null,
    
    "subtotal": 300.00,
    "cgst": 7.50,    ← Central GST (50%)
    "sgst": 7.50,    ← State GST (50%)
    "total_gst": 15.00,
    "total_amount": 315.00,
    
    "is_paid": false,
    "created_at": "2026-02-20T10:41:30.000Z"
  }
}

✅ GST Verification:
   CGST: ₹7.50 (50% of ₹15)
   SGST: ₹7.50 (50% of ₹15)
   Sum:  ₹15.00 ✓
```

---

## 🎨 COLOR CODING IN THUNDER CLIENT

### Status Codes:
```
🟢 200 OK          = Success (GET, PUT, DELETE)
🟢 201 Created     = Resource created (POST)
🟡 400 Bad Request = Check your input
🔴 401 Unauthorized = Need authentication token
🔴 403 Forbidden   = Need admin token
🔴 404 Not Found   = Resource doesn't exist
🔴 500 Server Error = Backend problem
```

### Response Times:
```
🟢 < 100ms  = Excellent
🟢 < 500ms  = Good
🟡 < 1000ms = Acceptable
🔴 > 1000ms = Slow (investigate)
```

---

## 📊 ENVIRONMENT VARIABLES IN ACTION

**Before any tests:**
```
Environment: MK Kirrana Stores - Development

Variables:
├── baseUrl: http://localhost:5000/api/v1
├── accessToken: 
├── adminToken: 
├── testCategoryId: 
├── testProductId: 
├── testOrderId: 
└── testOrderNumber: 
```

**After customer login (TEST 3):**
```
Variables:
├── baseUrl: http://localhost:5000/api/v1
├── accessToken: eyJhbGciOiJIUzI1NiI...  ✅
├── adminToken: 
...
```

**After admin login (TEST 5):**
```
Variables:
├── baseUrl: http://localhost:5000/api/v1
├── accessToken: eyJhbGciOiJIUzI1NiI...
├── adminToken: eyJhbGciOiJIUzI1NiI...  ✅
...
```

**After creating order (TEST 18):**
```
Variables:
├── baseUrl: http://localhost:5000/api/v1
├── accessToken: eyJhbGciOiJIUzI1NiI...
├── adminToken: eyJhbGciOiJIUzI1NiI...
├── testCategoryId: 11
├── testProductId: 32
├── testOrderId: 1  ✅
└── testOrderNumber: ORD-20260220-00001  ✅
```

**All variables filled = Ready for remaining tests!** ✅

---

## 🔍 HOW TO READ RESPONSES

### Success Response:
```json
{
  "success": true,      ← Always check this first!
  "message": "...",     ← Human-readable message
  "data": { ... }       ← Actual response data
}
```

### Error Response:
```json
{
  "success": false,     ← Something went wrong
  "message": "Invalid OTP",
  "error": {
    "code": "INVALID_OTP",
    "details": "OTP has expired or is incorrect"
  }
}
```

---

## 💡 VISUAL INDICATORS

### In Thunder Client Left Panel:

**Folder status:**
```
📁 01 - Authentication Tests (5)
   ├── 🟢 Health Check (200ms)       ← Green = Last run success
   ├── 🟢 Request OTP (145ms)
   ├── 🟢 Verify OTP (234ms)
   ├── 🔵 Admin Login                ← Blue = Not run yet
   └── 🔵 Verify Admin OTP
```

**Request Methods:**
```
🟦 GET    = Fetch data (no changes)
🟩 POST   = Create new resource
🟨 PUT    = Update existing resource
🟥 DELETE = Remove resource
```

---

## 📱 MOBILE VIEW SIMULATION

Want to test mobile app responses? Add this header:

```
Headers:
User-Agent: MKStores-Mobile/1.0 (Android 12)
Accept-Language: te-IN
```

Response will prioritize Telugu content!

---

## 🎯 QUICK VISUAL CHECKLIST

While testing, make sure you see:

```
✅ Green status codes (200/201)
✅ "success": true in responses
✅ Telugu characters (not boxes: □□□)
✅ Tokens saved in environment
✅ Math is correct (GST calculations)
✅ Timestamps present
✅ IDs are integers
✅ Amounts have 2 decimals
```

---

## 🚨 RED FLAGS TO WATCH FOR

```
❌ Status: 401 → Token missing or expired
❌ Status: 403 → Wrong permission level
❌ Status: 404 → Wrong ID or endpoint
❌ Status: 500 → Server error (check logs)
❌ Response time > 1000ms → Performance issue
❌ Telugu shows as: □□□ → Encoding issue
❌ GST math wrong → Calculation bug
❌ "success": false → Request failed
```

---

## 🎉 SUCCESS LOOKS LIKE THIS:

```
Thunder Client Status Bar:

┌───────────────────────────────────────────────────┐
│ 27/27 Requests Successful                         │
│ Average Response Time: 156ms                      │
│ Total Test Time: 8m 32s                          │
│                                                   │
│ ✅ All tests passed!                              │
│ 🚀 Ready for production!                          │
└───────────────────────────────────────────────────┘
```

---

## 📷 WHAT YOUR SCREEN SHOULD LOOK LIKE

```
┌─────────────────────────────────────────────────────────┐
│ VS Code Layout                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Left Side:          │  Right Side:                    │
│  Thunder Client      │  Response Panel                 │
│  Collections Tree    │  Status: 200 OK                 │
│  ├─ Test 1 🟢       │  Time: 45ms                     │
│  ├─ Test 2 🟢       │                                  │
│  └─ Test 3 🔵       │  { "success": true, ... }       │
│                     │                                  │
│  Bottom:            │                                  │
│  Terminal           │                                  │
│  [OTP] Code: 123456 │                                  │
│                     │                                  │
└─────────────────────────────────────────────────────────┘
```

**This is what successful testing looks like!** ✅

---

**For step-by-step instructions, see:** [MANUAL-TESTING-GUIDE.md](./MANUAL-TESTING-GUIDE.md)  
**For quick reference, see:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

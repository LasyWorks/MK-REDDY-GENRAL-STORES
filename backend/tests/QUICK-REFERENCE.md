# 📋 THUNDER CLIENT - QUICK REFERENCE CARD
## Keep This Open While Testing!

---

## 🚀 SETUP (Do Once)

### 1. Import Files
```
Thunder Client → Collections → Import
→ Select: thunder-client-collection.json

Thunder Client → Env → Import  
→ Select: thunder-client-environment.json
→ Select: "MK Kirrana Stores - Development"
```

### 2. Start Server
```bash
cd backend
npm run dev
# Wait for: Port: 5000 ✅
```

---

## 📱 TEST SEQUENCE (27 Tests)

### Phase 1: Setup (5 tests) 🔐

| # | Test Name | What to Do | What to Check |
|---|-----------|------------|---------------|
| 1 | Health Check | Just click Send | Status: 200 OK |
| 2 | Request OTP (Customer) | Click Send | Check terminal for OTP |
| 3 | Verify OTP (Customer) | Paste OTP from terminal | Get accessToken ✅ |
| 4 | Request OTP (Admin) | Click Send | Check terminal for OTP |
| 5 | Verify OTP (Admin) | Paste admin OTP | Get adminToken ✅ |

**✅ After Phase 1:** You have `{{accessToken}}` and `{{adminToken}}`

---

### Phase 2: Browse (7 tests) 🛍️

| # | Test Name | Auth Needed? | What to Check |
|---|-----------|--------------|---------------|
| 6 | Get All Categories | No | 10 categories, Telugu names |
| 7 | Get Category by ID | No | Single category details |
| 8 | Create Category | Admin ✅ | New category created |
| 9 | Get All Products | No | 31 products listed |
| 10 | Search Products | No | Search "Rice" works |
| 11 | Get Product by ID | No | Full product details |
| 12 | Create Product | Admin ✅ | New product created |

**✅ After Phase 2:** Products and categories working

---

### Phase 3: Shopping (5 tests) 🛒

| # | Test Name | What to Do | What to Check |
|---|-----------|------------|---------------|
| 13 | Get My Cart | Customer token | Empty cart initially |
| 14 | Add Item to Cart | Add product_id: 1, qty: 2 | Subtotal: ₹300, GST: ₹15 |
| 15 | Update Quantity | Change to qty: 5 | Amounts recalculated |
| 16 | Remove Item | Delete item | Item removed |
| 17 | Clear Cart | Delete cart | Cart empty |

**✅ After Phase 3:** Cart operations working

---

### Phase 4: Ordering (5 tests) 📝

| # | Test Name | What to Do | What to Check |
|---|-----------|------------|---------------|
| 14 | Re-add Items | Add products again | Cart has items ✅ |
| 18 | Create Order | Customer creates order | Order number generated |
| 19 | Get My Orders | List orders | See your order |
| 20 | Get Order by ID | View details | Full order info |
| 21 | Confirm Order | Admin confirms | Status: confirmed ✅ |
| 22 | Mark Ready | Admin marks ready | Status: ready_for_pickup ✅ |

**✅ After Phase 4:** Order workflow complete

---

### Phase 5: Invoice (2 tests) 🧾

| # | Test Name | What to Check |
|---|-----------|---------------|
| 23 | Get Invoice | CGST + SGST = Total GST ✅ |
| 24 | Download PDF | PDF file received ✅ |

**💡 GST Verification:**
```
Subtotal: ₹300.00
CGST:     ₹7.50  (50% of ₹15)
SGST:     ₹7.50  (50% of ₹15)
Total:    ₹315.00
```

---

### Phase 6: Admin (3 tests) 👨‍💼

| # | Test Name | What to Check |
|---|-----------|---------------|
| 25 | Get All Users | See admin + customers |
| 26 | Block User | User blocked with reason |
| 27 | View Logs | Admin actions logged |

**✅ After Phase 6:** Admin tools working

---

## 🎯 IMPORTANT TIPS

### Where to Find OTP
```
Look in VS Code terminal where server is running:

[OTP] Code for 9876543210: 123456  ← Copy this!
```

### Token Management
```
✅ Tokens auto-save after login:
- {{accessToken}} → Customer operations
- {{adminToken}} → Admin operations

Check in: Env tab → Variables
```

### Test Order Requirements
```
1. Must have items in cart BEFORE creating order
2. Admin must confirm order BEFORE invoice generates
3. Use {{testOrderId}} from successful order creation
```

---

## ⚡ QUICK CHECKS

### After Each Test, Verify:

**Status Codes:**
- ✅ 200 OK = Success
- ✅ 201 Created = Resource created
- ❌ 400 Bad Request = Check your input
- ❌ 401 Unauthorized = Need token
- ❌ 403 Forbidden = Need admin token
- ❌ 404 Not Found = Wrong ID

**Response Structure:**
```json
{
  "success": true,      ← Should be true
  "message": "...",     ← Success message
  "data": { ... }       ← Actual data
}
```

**GST Math:**
```
✓ CGST + SGST = Total GST
✓ Subtotal × (GST% / 100) = GST Amount
✓ Subtotal + GST = Total
```

---

## 🐛 TROUBLESHOOTING FAST

| Problem | Solution |
|---------|----------|
| Can't find OTP | Check terminal where npm run dev is running |
| 401 Error | Re-run login (TEST 3 or 5) |
| Cart empty error | Run TEST 14 to add items first |
| Invoice not found | Admin must confirm order first (TEST 21) |
| Server not responding | Check: npm run dev is running on port 5000 |
| Wrong environment | Select: "MK Kirrana Stores - Development" |

---

## 📊 SUCCESS INDICATORS

### All Green Means ✅:

```
✓ All 27 tests return 200/201 status
✓ Telugu text displays correctly (no boxes)
✓ Tokens saved automatically
✓ GST calculations accurate
✓ Order workflow complete
✓ Admin permissions working
```

---

## 🎯 TESTING CHECKLIST

Print this and check off as you test:

```
Authentication:
□ TEST 1  - Health Check
□ TEST 2  - Request Customer OTP
□ TEST 3  - Verify Customer OTP (got token)
□ TEST 4  - Request Admin OTP
□ TEST 5  - Verify Admin OTP (got token)

Categories & Products:
□ TEST 6  - List Categories (Telugu visible)
□ TEST 7  - Get Category
□ TEST 8  - Create Category (admin)
□ TEST 9  - List Products
□ TEST 10 - Search Products
□ TEST 11 - Get Product
□ TEST 12 - Create Product (admin)

Shopping Cart:
□ TEST 13 - View Cart (empty)
□ TEST 14 - Add Items
□ TEST 15 - Update Quantity
□ TEST 16 - Remove Item
□ TEST 17 - Clear Cart

Orders:
□ TEST 14 - Re-add Items
□ TEST 18 - Create Order (got order_number)
□ TEST 19 - List My Orders
□ TEST 20 - View Order
□ TEST 21 - Confirm (admin)
□ TEST 22 - Mark Ready (admin)

Invoices:
□ TEST 23 - Get Invoice (GST correct)
□ TEST 24 - Download PDF

Admin:
□ TEST 25 - List Users
□ TEST 26 - Block User
□ TEST 27 - View Logs

Total: __/27 Passed ✅
```

---

## 💡 PRO TIPS

### Speed Up Testing:
1. Keep terminal visible for OTP
2. Copy OTP immediately when it appears
3. Use Ctrl+Enter to send requests (keyboard shortcut)
4. Check status code first (green = good)
5. Collapse passed tests to focus on current one

### Common Mistakes:
- ❌ Forgetting to paste actual OTP
- ❌ Using customer token for admin endpoints
- ❌ Creating order without items in cart
- ❌ Wrong environment selected
- ❌ Server not running

---

## 📞 HELP COMMANDS

```bash
# Check if server is running
curl http://localhost:5000/api/v1/health

# View recent logs
tail -20 backend/logs/combined.log

# Check database data
node backend/scripts/test-db.js

# Re-seed database if needed
cd backend && npm run seed
```

---

## 🎉 DONE!

When all 27 tests pass:
- ✅ API is production ready
- ✅ All features working
- ✅ Security verified
- ✅ GST calculations correct

**Time to Deploy! 🚀**

---

**Keep this card handy during testing!**  
**For detailed steps, see:** [MANUAL-TESTING-GUIDE.md](./MANUAL-TESTING-GUIDE.md)

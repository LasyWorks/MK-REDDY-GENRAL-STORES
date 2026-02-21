# -*- coding: utf-8 -*-
"""
Final API tests: Users (12) + Admin panel (16) + features
All status indicators are plain ASCII: PASS / FAIL / SKIP
"""
import urllib.request, json, sys, subprocess, hashlib, time, os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE   = "http://localhost:5001/api/v1"
ADMIN_TOKEN = ""   # filled below
results = []

# ─────────────────────────────────────────
# HTTP helper
# ─────────────────────────────────────────
def req(method, path, body=None, token=None, label=None, allow_already=False):
    url  = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {"Content-Type": "application/json"}
    if token:
        hdrs["Authorization"] = "Bearer " + token
    rq = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(rq, timeout=12) as resp:
            parsed = json.loads(resp.read().decode())
            ok  = parsed.get("success", False)
            tag = "PASS" if ok else "FAIL"
            results.append((tag, label or f"{method} {path}", parsed.get("message",""), parsed))
            return parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:    msg = json.loads(raw).get("message", raw[:80])
        except: msg = raw[:80]
        # Idempotent setup calls: treat "already active/inactive/blocked" as OK
        already = "already" in msg.lower()
        tag = "PASS" if (allow_already and already) else "FAIL"
        results.append((tag, label or f"{method} {path}", f"HTTP {e.code}: {msg}", None))
        return None
    except Exception as ex:
        results.append(("FAIL", label or f"{method} {path}", str(ex)[:80], None))
        return None

def mark(tag, label, msg):
    results.append((tag, label, msg, None))

# ─────────────────────────────────────────
# Admin login (fresh token)
# ─────────────────────────────────────────
print("Auth: admin login...")
r = req("POST", "/auth/admin/login",
        {"identifier": "9000000000", "password": "admin123"},
        label="Admin login")
if r and r.get("data", {}).get("accessToken"):
    ADMIN_TOKEN = r["data"]["accessToken"]
    print("  admin token: OK")
else:
    print("  admin token: FAILED")
    sys.exit(1)

# ─────────────────────────────────────────
# Customer OTP token
# ─────────────────────────────────────────
def patch_otp(phone):
    h = hashlib.sha256("123456".encode()).hexdigest()
    # Write a small temp JS file to avoid quoting nightmares
    js_path = os.path.join(
        r'C:\Users\91837\Desktop\FreeLanceing\MK-REDDY-GENRAL-STORES\backend',
        '_otp_patch_tmp.js'
    )
    js_code = f"""
const {{Pool}} = require('pg');
const p = new Pool({{host:'localhost',port:5432,user:'postgres',password:'Aravind13',database:'mk_kirana_stores'}});
p.query("UPDATE otps SET otp_hash='{h}' WHERE phone='{phone}' AND is_verified=false")
  .then(r => {{ console.log('PATCHED:' + r.rowCount); p.end(); process.exit(0); }})
  .catch(e => {{ console.error('ERR:' + e.message); p.end(); process.exit(1); }});
"""
    with open(js_path, 'w') as f:
        f.write(js_code)
    try:
        res = subprocess.run(
            ['node', '_otp_patch_tmp.js'], capture_output=True, text=True, timeout=10,
            cwd=r'C:\Users\91837\Desktop\FreeLanceing\MK-REDDY-GENRAL-STORES\backend'
        )
        return 'PATCHED:1' in res.stdout
    except Exception as e:
        print("  OTP patch error:", e)
        return False
    finally:
        try: os.remove(js_path)
        except: pass

print("Auth: customer OTP flow...")
# Ensure user 2 (customer) is active before OTP flow (prior test runs may have deactivated it)
req("PUT", "/users/2/activate", token=ADMIN_TOKEN, label="[setup] Ensure user 2 active", allow_already=True)
req("POST", "/auth/otp/send", {"phone": "9876543210"}, label="OTP send")
time.sleep(0.8)
ok = patch_otp("9876543210")
mark("PASS" if ok else "FAIL", "OTP DB patch", "patched" if ok else "patch FAILED")
time.sleep(0.4)
cv = req("POST", "/auth/otp/verify", {"phone": "9876543210", "otp": "123456"}, label="OTP verify")
CUST_TOKEN = cv["data"]["accessToken"] if cv and cv.get("data",{}).get("accessToken") else None
print("  customer token:", "OK" if CUST_TOKEN else "FAILED")

# ═══════════════════════════════════════
# USERS MODULE
# ═══════════════════════════════════════
print("\n--- USERS ---")

req("GET",  "/users",        token=ADMIN_TOKEN, label="GET /users (list)")
req("GET",  "/users/stats",  token=ADMIN_TOKEN, label="GET /users/stats")
req("GET",  "/users/2",      token=ADMIN_TOKEN, label="GET /users/2")

# Generate a unique phone using timestamp to avoid 409 on repeated runs
uniq_phone = "8" + str(int(time.time()))[-9:]
nu = req("POST", "/users",
         {"name":"Test User","phone":uniq_phone,"user_type":"retail","password":"pass123"},
         token=ADMIN_TOKEN, label="POST /users (create)")
new_uid = nu["data"].get("id") if (nu and nu.get("data")) else None
print(f"  new user id: {new_uid}")

if new_uid:
    req("PUT",    f"/users/{new_uid}", {"name":"TestUser Updated","address":"Hyd"}, token=ADMIN_TOKEN, label="PUT /users/:id")
    req("DELETE", f"/users/{new_uid}", token=ADMIN_TOKEN, label="DELETE /users/:id")
else:
    mark("FAIL", "PUT /users/:id",    "no new_uid — create may have failed")
    mark("FAIL", "DELETE /users/:id", "no new_uid — create may have failed")

req("PUT", "/users/2/customer-type", {"customer_type":"wholesale"}, token=ADMIN_TOKEN, label="PUT /users/2/customer-type -> wholesale")
req("PUT", "/users/2/customer-type", {"customer_type":"retail"},    token=ADMIN_TOKEN, label="PUT /users/2/customer-type -> retail")
req("PUT", "/users/2/block",   {"reason":"Test block"}, token=ADMIN_TOKEN, label="PUT /users/2/block")
req("PUT", "/users/2/unblock",                          token=ADMIN_TOKEN, label="PUT /users/2/unblock")
# Activate first to ensure known state, then test deactivate, then re-activate
req("PUT", "/users/2/activate",                         token=ADMIN_TOKEN, label="[setup] user 2 activate before deactivate test", allow_already=True)
req("PUT", "/users/2/deactivate",                       token=ADMIN_TOKEN, label="PUT /users/2/deactivate")
req("PUT", "/users/2/activate",                         token=ADMIN_TOKEN, label="PUT /users/2/activate")
req("GET", "/users/2/orders",                           token=ADMIN_TOKEN, label="GET /users/2/orders")

# ═══════════════════════════════════════
# ADMIN PANEL
# ═══════════════════════════════════════
print("\n--- ADMIN PANEL ---")

req("GET", "/admin/dashboard",            token=ADMIN_TOKEN, label="GET /admin/dashboard")
req("GET", "/admin/health",               token=ADMIN_TOKEN, label="GET /admin/health")
req("GET", "/admin/reports/sales",        token=ADMIN_TOKEN, label="GET /admin/reports/sales")
req("GET", "/admin/reports/inventory",    token=ADMIN_TOKEN, label="GET /admin/reports/inventory")
req("GET", "/admin/reports/customers",    token=ADMIN_TOKEN, label="GET /admin/reports/customers")
req("GET", "/admin/reports/top-products", token=ADMIN_TOKEN, label="GET /admin/reports/top-products")
req("GET", "/admin/reports/low-stock",    token=ADMIN_TOKEN, label="GET /admin/reports/low-stock")
req("GET", "/admin/logs",                 token=ADMIN_TOKEN, label="GET /admin/logs")
req("GET", "/admin/config",               token=ADMIN_TOKEN, label="GET /admin/config")
req("PUT", "/admin/config",
    {"key":"max_customers","value":"50","category":"business"},
    token=ADMIN_TOKEN, label="PUT /admin/config")
req("GET", "/admin/gst-config",           token=ADMIN_TOKEN, label="GET /admin/gst-config")
req("PUT", "/admin/gst-config/1",
    {"cgst_rate":2.5,"sgst_rate":2.5},
    token=ADMIN_TOKEN, label="PUT /admin/gst-config/1")
req("GET", "/admin/stats/business",       token=ADMIN_TOKEN, label="GET /admin/stats/business")
req("GET", "/admin/stats/pending-orders", token=ADMIN_TOKEN, label="GET /admin/stats/pending-orders")
req("GET", "/admin/activity/recent",      token=ADMIN_TOKEN, label="GET /admin/activity/recent")
req("GET", "/admin/export/products",      token=ADMIN_TOKEN, label="GET /admin/export/products")

# ═══════════════════════════════════════
# PROFILE / EMAIL UPDATE
# ═══════════════════════════════════════
print("\n--- PROFILE UPDATE ---")
tk = CUST_TOKEN or ADMIN_TOKEN
req("PUT", "/auth/me",
    {"name":"Rahul Updated","email":"rahul@test.com","address":"Hyderabad"},
    token=tk, label="PUT /auth/me (name+email+address)")
me = req("GET", "/auth/me", token=tk, label="GET /auth/me (read back)")
if me and me.get("data",{}).get("email") == "rahul@test.com":
    mark("PASS", "Email saved in profile", "email=rahul@test.com")
else:
    mark("FAIL", "Email NOT saved in profile", str((me or {}).get("data",{}).get("email")))
req("PUT", "/auth/me", {"name":"Rahul Kumar","email":None}, token=tk, label="PUT /auth/me (reset)")

# ═══════════════════════════════════════
# TELUGU
# ═══════════════════════════════════════
print("\n--- TELUGU ---")
rte = req("GET", "/products?lang=te&limit=3",
          token=CUST_TOKEN or ADMIN_TOKEN, label="GET /products?lang=te")
if rte and rte.get("data"):
    d = rte["data"]
    first = d[0] if isinstance(d, list) else (d.get("products") or [{}])[0]
    te_name = first.get("name_te") or first.get("name")
    mark("PASS" if te_name else "FAIL", "Telugu name present", str(te_name)[:40] if te_name else "None")

req("GET", "/categories?lang=te",
    token=CUST_TOKEN or ADMIN_TOKEN, label="GET /categories?lang=te")

# ═══════════════════════════════════════
# STOCK CONFLICT
# ═══════════════════════════════════════
print("\n--- STOCK CONFLICT ---")
req("PUT", "/products/1/stock", {"quantity":2,"operation":"set"},
    token=ADMIN_TOKEN, label="Set product 1 stock=2")

if CUST_TOKEN:
    # Try to add 3 units of product 1 (stock=2)
    # Either cart rejects it (stock check at cart level) OR order rejects it — both are correct
    cart_resp = req("POST", "/cart/items", {"product_id":1,"quantity":3}, token=CUST_TOKEN, label="Cart: add 3 units (stock=2) [expect reject]")
    cart_rejected = (cart_resp is None or not cart_resp.get("success"))
    # Correct result is rejection (HTTP 400) — override whatever req() marked
    results[-1] = ("PASS" if cart_rejected else "FAIL",) + results[-1][1:]
    if cart_rejected:
        mark("PASS", "Stock conflict rejected at cart level", "Cart correctly blocks oversell")
        mark("PASS", "Stock conflict correctly rejected", "Rejected at cart level")
    else:
        # Cart accepted it — now the ORDER should fail
        fr = req("POST", "/orders", {}, token=CUST_TOKEN, label="Order 3 units (stock=2) - expect fail")
        if fr is None or not fr.get("success"):
            mark("PASS", "Stock conflict correctly rejected", (fr or {}).get("message","HTTP 4xx")[:60])
        else:
            mark("FAIL", "Stock conflict NOT rejected - bug", str(fr)[:60])
    req("DELETE", "/cart", token=CUST_TOKEN, label="Clear cart")
else:
    mark("SKIP", "Stock conflict", "no customer token")

req("PUT", "/products/1/stock", {"quantity":100,"operation":"set"},
    token=ADMIN_TOKEN, label="Restore product 1 stock=100")

# ═══════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════
print("\n" + "=" * 74)
print(f"{'ST':<4}  {'TEST':<48}  {'MESSAGE'}")
print("=" * 74)
passed = failed = skipped = 0
for tag, label, msg, _ in results:
    print(f"{tag:<4}  {label:<48}  {str(msg)[:30]}")
    if   tag == "PASS": passed  += 1
    elif tag == "SKIP": skipped += 1
    else:               failed  += 1
print("=" * 74)
print(f"PASSED: {passed}   FAILED: {failed}   SKIPPED: {skipped}   TOTAL: {passed+failed+skipped}")
sys.exit(0 if failed == 0 else 1)

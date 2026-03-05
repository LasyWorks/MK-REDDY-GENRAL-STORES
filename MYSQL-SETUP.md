# MySQL Setup Guide — MK Reddy General Stores

This project supports **two databases** simultaneously:

| Database | When Active | Use Case |
|---|---|---|
| **Supabase / PostgreSQL** | `DB_TYPE=postgres` (default) | Production / cloud |
| **MySQL 8+** | `DB_TYPE=mysql` | Local development / self-hosted |

Switching databases requires **only one `.env` change** — no code modifications.

---

## Prerequisites

| Requirement | Version |
|---|---|
| MySQL Server | 8.0 or higher |
| Node.js | 18+ |
| npm package `mysql2` | already installed |

> MySQL 8.4 is confirmed working. The service name on Windows is `MySQL84`.

---

## Quick Start (3 steps)

### Step 1 — Set your MySQL password in `backend/.env`

Open `backend/.env` and update the MySQL section at the bottom:

```env
# ── MySQL ─────────────────────────────────────────────────
# DB_TYPE=mysql          ← uncomment this line to activate MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE   ← change this
MYSQL_NAME=mk_kirana_stores
```

### Step 2 — Run the migration (creates all tables)

```bash
cd backend
node src/database/migrate-mysql.js
```

Expected output:
```
=== MK Kirana Stores — MySQL Migration ===
✓ Database 'mk_kirana_stores' ready.
── Phase 1: Creating tables ──────────────
  ✓ roles
  ✓ users
  ... (23 tables total)
── Phase 2: Adding foreign key constraints
  ✓ fk_users_role
  ... (22 FK constraints)
── Phase 3: Seeding default data ─────────
  ✓ roles (3 default roles)
  ✓ system_config (4 entries)
  ✓ store_settings (3 entries)
✅  MySQL Migration Complete!
```

### Step 3 — Activate MySQL

In `backend/.env`, uncomment the `DB_TYPE` line:

```env
DB_TYPE=mysql    # ← remove the # at the start
```

Then restart the backend:

```bash
cd backend
node src/server.js
```

You should see:
```
[MYSQL] Database connection established successfully
Server running on port 5001
```

---

## Switching Between Databases

### Use MySQL (local)
```env
DB_TYPE=mysql
```

### Use Supabase / PostgreSQL (cloud)
```env
# DB_TYPE=mysql    ← comment it out or delete the line
```

The default (when `DB_TYPE` is absent) is always **PostgreSQL / Supabase**.

---

## Database Schema

The migration creates **23 tables** with **22 foreign key constraints**:

```
mk_kirana_stores
├── roles                     — admin, retail_customer, wholesale_customer
├── users                     — all user accounts (FK → roles)
├── otps                      — OTP codes for login / register / merge
├── refresh_tokens            — JWT refresh tokens (FK → users)
├── failed_login_attempts     — brute-force tracking
│
├── categories                — product categories (self-ref parent)
├── category_translations     — en/te/hi names (FK → categories)
│
├── products                  — main product catalogue (FK → categories)
├── product_translations      — en/te names, FULLTEXT index (FK → products)
│
├── promotions                — sales, flash deals, festivals
├── promotion_products        — product↔promotion mapping (FK → both)
│
├── carts                     — one cart per user (FK → users)
├── cart_items                — cart line items (FK → carts, products)
│
├── orders                    — customer orders (FK → users, promotions)
├── order_items               — order line items (FK → orders, products)
├── invoices                  — GST invoices (FK → orders)
│
├── admin_logs                — audit trail (FK → users)
├── system_config             — key/value app settings
├── store_settings            — min_order_amount, delivery_charge, etc.
│
├── linked_identities         — linked email accounts (FK → users)
├── merge_sessions            — account merge workflow (FK → users)
├── merge_otps                — OTPs used during merge (FK → merge_sessions)
└── merge_audit_log           — permanent merge history
```

### Key Design Decisions

| Choice | Reason |
|---|---|
| `CHAR(36)` UUIDs | Matches PostgreSQL UUID primary keys exactly |
| `utf8mb4 / utf8mb4_unicode_ci` | Supports Telugu, Hindi, and all emoji |
| FKs via `ALTER TABLE` | Avoids MySQL 8.4 type-compatibility errors at `CREATE TABLE` time |
| `INSERT IGNORE` for seeds | Safe to re-run migration without errors |
| No `CHECK` constraints | MySQL 8.0.16+ supports them but they're not enforced by default; app layer validates instead |

---

## Environment Variables Reference

```env
# Switch the active database
DB_TYPE=mysql                  # or 'postgres' (default)

# MySQL connection
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=Srivardhan@04   # your MySQL root password
MYSQL_NAME=mk_kirana_stores    # database name (auto-created by migration)
```

---

## Troubleshooting

### `Access denied for user 'root'@'localhost'`
The password in `.env` is wrong.  
Open MySQL Workbench → test connection → verify your root password.

### `Cannot connect to MySQL server`
Check the MySQL service is running:
```powershell
Get-Service -Name "MySQL84"        # Windows
# Should show: Status = Running
```

Start it if stopped:
```powershell
Start-Service -Name "MySQL84"
```

### `ER_DUP_KEYNAME` warnings during migration
The migration was already run. These are safe — the script skips duplicate FK names automatically.

### `Unknown database 'mk_kirana_stores'`
The migration hasn't been run yet. Run Step 2 above.

### Backend starts but shows `DB_TYPE: postgres`
`DB_TYPE=mysql` is still commented out in `.env`. Remove the `#`.

---

## Data Migration from Supabase → MySQL

> The migration script only creates the **schema** (tables + FK).  
> It does **NOT** copy data from Supabase.

To also migrate your Supabase data to MySQL, you would need to run a data-export script (not yet included). Until then, the MySQL database starts empty with only the seeded default roles and settings.

---

## File Reference

| File | Purpose |
|---|---|
| `backend/src/database/migrate-mysql.js` | Run once to create all tables and seed data |
| `backend/src/config/database.js` | Dual-adapter — routes queries to MySQL or PostgreSQL |
| `backend/src/config/index.js` | Exposes `mysqlHost`, `mysqlPort`, `mysqlUser`, `mysqlPassword`, `mysqlName` |
| `backend/.env` | Set `DB_TYPE` and `MYSQL_*` variables here |

---

## Verified Working

| Test | Result |
|---|---|
| MySQL 8.4 connection | ✅ `[MYSQL] Database connection established successfully` |
| Migration (23 tables, 22 FKs) | ✅ All created without errors |
| SQL translator (ILIKE→LIKE, `$n`→`?`, RETURNING stripped, UPDATE FROM→JOIN) | ✅ All 4 tests pass |
| Backend API with `DB_TYPE=mysql` | ✅ Starts and serves requests |
| Supabase unaffected | ✅ `DB_TYPE=postgres` still default; Supabase credentials intact |

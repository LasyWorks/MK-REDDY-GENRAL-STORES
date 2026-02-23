# Translation Test Cases — README

## Overview

This document covers the **Language Translation Test Suite** (`test-translations.js`) for the MK Reddy General Stores backend. The test suite validates that **English (en)** and **Telugu (te)** translations are correctly stored and queried from the Supabase PostgreSQL database.

---

## Quick Start

```bash
cd backend
node tests/test-translations.js
```

**Prerequisites:**

- Node.js >= 18
- `npm install` completed in the `backend/` folder
- Valid `.env` with Supabase credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`)

---

## Test File Location

```
backend/
  tests/
    test-translations.js      ← Main test script
    TRANSLATION-TESTS.md      ← This file
```

---

## Test Groups

The suite is organized into **3 groups** containing **46 total assertions**.

### Group 1 — Category Translations (16 tests)

| #    | Test ID | Description                                                 | Expected         |
| ---- | ------- | ----------------------------------------------------------- | ---------------- |
| 1    | 1a      | English translations exist for all categories               | 10 rows returned |
| 2    | 1a      | First English category name                                 | `"Cooking Oils"` |
| 3    | 1b      | Telugu translations exist for all categories                | 10 rows returned |
| 4    | 1b      | First Telugu category name                                  | `"వంట నూనెలు"`   |
| 5    | 1c      | COALESCE returns Telugu when `lang=te`                      | `"వంట నూనెలు"`   |
| 6    | 1d      | Unknown language (`fr`) falls back to English               | `"Cooking Oils"` |
| 7–16 | 1e      | Each of the 10 Telugu category names matches expected value | See table below  |

**Expected Telugu Category Names:**

| Order | English          | Telugu            |
| ----- | ---------------- | ----------------- |
| 1     | Cooking Oils     | వంట నూనెలు        |
| 2     | Rice & Grains    | బియ్యం & ధాన్యాలు |
| 3     | Pulses & Lentils | పప్పులు           |
| 4     | Spices & Masalas | మసాలాలు           |
| 5     | Flour & Atta     | పిండి             |
| 6     | Sugar & Salt     | చక్కెర & ఉప్పు    |
| 7     | Dry Fruits       | డ్రై ఫ్రూట్స్     |
| 8     | Beverages        | పానీయాలు          |
| 9     | Dairy Products   | పాల ఉత్పత్తులు    |
| 10    | Snacks           | స్నాక్స్          |

---

### Group 2 — Product Translations (24 tests)

| #    | Test ID | Description                                 | Expected             |
| ---- | ------- | ------------------------------------------- | -------------------- |
| 1    | 2a      | English translations exist for all products | 18 rows              |
| 2    | 2b      | Telugu translations exist for all products  | 18 rows              |
| 3    | 2c      | OIL001 has correct Telugu name              | `"సన్ ఫ్లవర్ ఆయిల్"` |
| 4    | 2d      | Full COALESCE join returns all products     | 18 rows              |
| 5    | 2d      | Telugu product name `"కాఫీ పొడి"` found     | present in results   |
| 6    | 2d      | Telugu category name `"వంట నూనెలు"` in join | present in results   |
| 7–24 | 2e      | Each of the 18 Telugu product names matches | See table below      |

**Expected Telugu Product Names:**

| SKU    | English           | Telugu (తెలుగు)  |
| ------ | ----------------- | ---------------- |
| OIL001 | Sunflower Oil     | సన్ ఫ్లవర్ ఆయిల్ |
| OIL002 | Groundnut Oil     | వేరుశనగ నూనె     |
| OIL003 | Coconut Oil       | కొబ్బరి నూనె     |
| RIC001 | Basmati Rice      | బాస్మతి బియ్యం   |
| RIC002 | Sona Masoori Rice | సోనా మసూరి       |
| PUL001 | Toor Dal          | కంది పప్పు       |
| PUL002 | Moong Dal         | పెసర పప్పు       |
| SPI001 | Turmeric Powder   | పసుపు            |
| SPI002 | Red Chilli Powder | కారం పొడి        |
| FLR001 | Wheat Atta        | గోధుమ పిండి      |
| SUG001 | Sugar             | చక్కెర           |
| SAL001 | Table Salt        | ఉప్పు            |
| DRY001 | Almonds           | బాదం             |
| DRY002 | Cashews           | జీడిపప్పు        |
| BEV001 | Tea Powder        | టీ పొడి          |
| BEV002 | Coffee Powder     | కాఫీ పొడి        |
| DAI001 | Pure Ghee         | నెయ్యి           |
| SNK001 | Potato Chips      | బంగాళదుంప చిప్స్ |

---

### Group 3 — Edge Cases (6 tests)

| #   | Test ID | Description                                     | Expected     |
| --- | ------- | ----------------------------------------------- | ------------ |
| 1   | 3a      | No duplicate category translations              | 0 duplicates |
| 2   | 3a      | No duplicate product translations               | 0 duplicates |
| 3   | 3b      | Every category has both EN and TE rows          | 0 missing    |
| 4   | 3c      | Every product has both EN and TE rows           | 0 missing    |
| 5   | 3d      | Telugu Unicode `LIKE '%నూనె%'` search works     | ≥ 1 row      |
| 6   | 3e      | `pg_trgm` similarity search for `"పసుపు"` works | ≥ 1 row      |

---

## Database Schema Reference

The translation system uses two tables that mirror the base entity tables:

### `category_translations`

| Column      | Type         | Constraints                           |
| ----------- | ------------ | ------------------------------------- |
| id          | SERIAL       | PRIMARY KEY                           |
| category_id | INT          | FK → categories(id) ON DELETE CASCADE |
| lang_code   | VARCHAR(5)   | NOT NULL                              |
| name        | VARCHAR(200) | NOT NULL                              |
| description | TEXT         | nullable                              |
|             |              | UNIQUE (category_id, lang_code)       |

### `product_translations`

| Column      | Type         | Constraints                         |
| ----------- | ------------ | ----------------------------------- |
| id          | SERIAL       | PRIMARY KEY                         |
| product_id  | INT          | FK → products(id) ON DELETE CASCADE |
| lang_code   | VARCHAR(5)   | NOT NULL                            |
| name        | VARCHAR(400) | NOT NULL                            |
| description | TEXT         | nullable                            |
|             |              | UNIQUE (product_id, lang_code)      |

**Indexes:**

- `idx_cat_trans_category` — on `category_id`
- `idx_cat_trans_lang` — on `lang_code`
- `idx_prod_trans_product` — on `product_id`
- `idx_prod_trans_lang` — on `lang_code`
- `idx_prod_trans_name` — GIN trigram index on `name` (for fuzzy search)

---

## How the Translation System Works

### Language Detection (Middleware)

The `languageMiddleware` (`src/middlewares/language.js`) determines the language from:

1. **Query parameter** — `?lang=te` (highest priority)
2. **Accept-Language header** — e.g. `Accept-Language: te`
3. **Default** — `en` (from config)

Supported languages: `en` (English), `te` (Telugu)

### Query Pattern (Models)

Both `Category.js` and `Product.js` models use the same pattern:

```sql
-- Two LEFT JOINs: one for the requested language, one for English fallback
LEFT JOIN category_translations t_req ON c.id = t_req.category_id AND t_req.lang_code = $1
LEFT JOIN category_translations t_en  ON c.id = t_en.category_id  AND t_en.lang_code  = 'en'

-- COALESCE picks the requested language, falls back to English
SELECT COALESCE(t_req.name, t_en.name) AS name
```

This means:

- If Telugu translation exists → returns Telugu
- If Telugu is missing → automatically returns English
- English is **always** the fallback language

### API Usage Examples

```bash
# Get categories in English (default)
GET /api/v1/categories

# Get categories in Telugu
GET /api/v1/categories?lang=te

# Get product in Telugu using header
GET /api/v1/products/1
Accept-Language: te

# Get products in a category, Telugu
GET /api/v1/categories/1/products?lang=te
```

---

## Interpreting Test Output

**Successful run:**

```
═══ TEST GROUP 1: Category Translations ═══
  ✔ PASS: All 10 categories have English translations (got 10)
  ✔ PASS: First EN category = "Cooking Oils" (got "Cooking Oils")
  ...

══════════════════════════════════════════════════
  RESULTS:  46 passed,  0 failed,  46 total
══════════════════════════════════════════════════
```

Exit code: `0`

**Failed run:**

```
  ✘ FAIL: Product OIL001 Telugu = "సన్ ఫ్లవర్ ఆయిల్" (got "undefined")
```

Exit code: `1`

---

## Troubleshooting

| Issue                                  | Cause                      | Fix                                                                  |
| -------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `Cannot find module 'pg'`              | Dependencies not installed | Run `npm install` in `backend/`                                      |
| `Connection refused`                   | Wrong DB_HOST/DB_PORT      | Check `.env` — Supabase host is `db.<project>.supabase.co`           |
| `password authentication failed`       | Wrong DB_PASSWORD          | Update `.env` with correct Supabase database password                |
| `relation "categories" does not exist` | Migration not run          | Run `node src/database/migrate-supabase.js`                          |
| Telugu text displays as `???`          | Terminal encoding issue    | Use a terminal with UTF-8 support (Windows Terminal, VS Code)        |
| `pg_trgm` test fails                   | Extension not enabled      | Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in Supabase SQL editor |

---

## Adding a New Language

To add a new language (e.g. Hindi `hi`):

1. **Config** — Add `'hi'` to `supportedLanguages` array in `src/config/index.js`
2. **Seed data** — Insert rows into `category_translations` and `product_translations` with `lang_code = 'hi'`
3. **No model/controller changes needed** — The COALESCE pattern automatically handles it
4. **Update tests** — Add Hindi expected values in `test-translations.js`

```sql
-- Example: add Hindi for category 1
INSERT INTO category_translations (category_id, lang_code, name, description)
VALUES (1, 'hi', 'खाना पकाने के तेल', 'All types of cooking oils');
```

---

## Last Run Results

```
Date:    2026-02-23
Target:  Supabase (fozaiesyhkasmveiymot.supabase.co)
Result:  46 passed, 0 failed, 46 total
Status:  ✔ ALL TESTS PASSING
```

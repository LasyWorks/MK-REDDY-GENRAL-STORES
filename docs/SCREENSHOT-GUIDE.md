# Screenshot Guide

This guide explains how to capture and add screenshots to enhance the README documentation.

## Required Screenshots

Place all screenshots in the `docs/images/` directory. The README references these images:

### 1. Admin Dashboard (`admin-dashboard.png`)
**What to capture:**
- Admin dashboard statistics page showing:
  - Total sales, orders, customers
  - Revenue charts
  - Recent activities
  - Low stock alerts

**How to capture:**
```bash
# Start the server
cd backend
npm start

# Login as admin
# POST http://localhost:5001/api/v1/auth/admin/login
# Body: {"phone": "9000000000", "password": "admin123"}

# Access dashboard endpoint
# GET http://localhost:5001/api/v1/admin/dashboard
```

**Screenshot tool:** Use Postman, Thunder Client, or browser with formatted JSON viewer

---

### 2. API Reference (`api-reference.png`)
**What to capture:**
- Any API testing tool showing the 87+ routes:
  - Request structure
  - Response format
  - Success/error examples

**Suggestion:** Use Thunder Client in VS Code with the collection at:
```
backend/tests/thunder-client-collection.json
```

---

### 3. Bilingual Products (`bilingual-products.png`)
**What to capture:**
- Side-by-side comparison of:
  - `GET /api/v1/products` (English names)
  - `GET /api/v1/products?lang=te` (Telugu names)

**Example response to show:**
```json
// English
{
  "name": "Almonds",
  "category_name": "Dry Fruits"
}

// Telugu (?lang=te)
{
  "name": "బాదం",
  "category_name": "డ్రై ఫ్రూట్స్"
}
```

---

### 4. Test Results (`test-results.png`)
**What to capture:**
- Terminal output from:
```bash
cd backend
python tests/run_final_tests.py
```

**Key elements to show:**
- ASCII table with PASS/FAIL status
- Final summary: `PASSED: 48   FAILED: 0   SKIPPED: 0   TOTAL: 48`
- Color coding if terminal supports it

---

## Screenshot Specifications

| Parameter | Value |
|---|---|
| Format | PNG (recommended) or JPG |
| Width | 800-1200px (will be resized to 400px in README) |
| DPI | 72-144 |
| Compression | Medium (keep file size under 500KB) |

---

## Adding Screenshots

1. **Capture screenshots** using the guidelines above
2. **Save to correct location:**
   ```
   docs/images/admin-dashboard.png
   docs/images/api-reference.png
   docs/images/bilingual-products.png
   docs/images/test-results.png
   ```
3. **Verify README links** — they already point to these files
4. **Commit and push:**
   ```bash
   git add docs/images/*.png
   git commit -m "docs: add API screenshots"
   git push
   ```

---

## Optional Enhancements

### Logo (`logo.png`)
Create a simple logo for the store (200x200px). Can use:
- Store initials "MK"
- Shopping cart icon
- Bilingual text overlay

### Additional Screenshots
- Invoice PDF sample
- Mobile PWA mockup
- Database schema visualization (export from pgAdmin)
- Grafana/monitoring dashboard (if implemented)

---

## Tools Recommended

- **API Testing:** Postman, Thunder Client, Insomnia
- **JSON Formatting:** [CodeBeautify](https://codebeautify.org/jsonviewer)
- **Terminal Screenshots:** Windows Snipping Tool, macOS Screenshot (Cmd+Shift+4)
- **Image Editing:** GIMP, Photopea, or simple crop/resize tools
- **SVG Editing (for logo):** Inkscape, Figma

---

## GitHub Rendering

GitHub automatically renders:
- ✅ PNG/JPG images
- ✅ Mermaid diagrams (already in README)
- ✅ Shields.io badges (already in README)

Once images are committed, they will display on:
- Main README.md
- Repository overview page
- GitHub search results (if keywords match)

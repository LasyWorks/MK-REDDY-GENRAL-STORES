/**
 * api-health-check.js — comprehensive API smoke test
 * Run: node api-health-check.js
 * Set ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD env vars (or add to .env):
 *   ADMIN_TEST_EMAIL=yourEmail@example.com
 *   ADMIN_TEST_PASSWORD=YourPassword
 */
require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:5001/api/v1';
let TOKEN = null;

function req(method, path, body, authToken) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, json, raw: data.substring(0, 200) });
      });
    });
    r.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (postData) r.write(postData);
    r.end();
  });
}

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️ ';

function check(label, res, expectStatus, extraCheck) {
  const ok = res.status === expectStatus;
  const extra = extraCheck ? extraCheck(res.json) : true;
  const icon = (ok && extra) ? PASS : (ok && !extra ? WARN : FAIL);
  const detail = res.json?.pagination
    ? `items=${res.json.pagination.totalItems}`
    : res.json?.data && Array.isArray(res.json.data)
    ? `count=${res.json.data.length}`
    : res.json?.message || res.json?.error || res.raw?.substring(0, 80) || '';
  console.log(`${icon} [${res.status}] ${label} ${detail ? '— ' + detail : ''}`);
  return ok && extra;
}

async function run() {
  console.log('=== MK-REDDY API HEALTH CHECK ===\n');

  // ── Health ──────────────────────────────────────────────────────────────────
  console.log('── General ──');
  const health = await req('GET', '/health');
  check('GET /health', health, 200, j => j?.data?.checks?.database === 'ok' || j?.checks?.database === 'ok');

  // ── Auth ──────────────────────────────────────────────────────────────────
  console.log('\n── Auth ──');
  const adminLogin = await req('POST', '/auth/admin/login', { 
    identifier: process.env.ADMIN_TEST_EMAIL || 'srivardhantalapaneni@gmail.com', 
    password: process.env.ADMIN_TEST_PASSWORD || '' 
  });
  if (adminLogin.status === 200 && adminLogin.json?.data?.accessToken) {
    TOKEN = adminLogin.json.data.accessToken;
    check('POST /auth/admin/login', adminLogin, 200, j => !!j?.data?.accessToken);
  } else {
    console.log(`⚠️  [${adminLogin.status}] POST /auth/admin/login — ${adminLogin.json?.message || 'failed, skipping protected routes'}`);
  }

  const badLogin = await req('POST', '/auth/admin/login', { identifier: 'bad@bad.com', password: 'wrong' });
  const badOk = [400, 401, 403].includes(badLogin.status);
  console.log(`${badOk ? '✅' : '❌'} [${badLogin.status}] POST /auth/admin/login (bad creds) → expects 4xx`);

  // ── Categories ────────────────────────────────────────────────────────────
  console.log('\n── Categories ──');
  const cats = await req('GET', '/categories?limit=200&is_active=true');
  check('GET /categories (active)', cats, 200, j => j?.data?.length > 0);

  const allCats = await req('GET', '/categories?limit=200');
  check('GET /categories (all)', allCats, 200, j => j?.data?.length > 0);

  // ── Products ──────────────────────────────────────────────────────────────
  console.log('\n── Products ──');
  const prods = await req('GET', '/products?limit=20&is_active=true');
  check('GET /products (list)', prods, 200, j => j?.data?.length > 0);

  const parentCat = await req('GET', '/products?parent_category_id=019caa2f-fa9d-76bf-9a1d-362cd19d1887&limit=10&is_active=true');
  check('GET /products (parent_category_id)', parentCat, 200, j => j?.pagination?.totalItems > 0);

  const subCat = await req('GET', '/products?category_id=019caa2f-fd79-7fe9-a370-464af2d01d66&limit=10&is_active=true');
  check('GET /products (category_id)', subCat, 200, j => j?.pagination?.totalItems > 0);

  const searchProd = await req('GET', '/products/search?q=soap&limit=5');
  check('GET /products/search', searchProd, 200, j => j?.data?.length > 0);

  const prodPricing = await req('GET', '/products?min_price=10&max_price=200&limit=5&is_active=true');
  check('GET /products (price filter)', prodPricing, 200, j => j?.data?.length > 0);

  const firstProdId = prods.json?.data?.[0]?.id;
  if (firstProdId) {
    const singleProd = await req('GET', `/products/${firstProdId}`);
    check('GET /products/:id (valid)', singleProd, 200, j => j?.data?.id === firstProdId);
  }

  const badProd = await req('GET', '/products/not-a-valid-uuid');
  const badProdOk = [400, 404].includes(badProd.status);
  console.log(`${badProdOk ? '✅' : '❌'} [${badProd.status}] GET /products/:invalid → expects 400/404 (not 500)`);

  // ── Promotions (public) ────────────────────────────────────────────────────
  console.log('\n── Promotions ──');
  const promoActive = await req('GET', '/promotions/active');
  check('GET /promotions/active (public)', promoActive, 200);

  const promoMap = await req('GET', '/promotions/product-map');
  check('GET /promotions/product-map (public)', promoMap, 200);

  // ── Admin protected routes ─────────────────────────────────────────────────
  if (TOKEN) {
    console.log('\n── Admin Routes ──');
    const dashboard = await req('GET', '/admin/dashboard', null, TOKEN);
    check('GET /admin/dashboard', dashboard, 200, j => j?.data !== undefined);

    const salesReport = await req('GET', '/admin/reports/sales?group_by=day', null, TOKEN);
    check('GET /admin/reports/sales', salesReport, 200);

    const topProds = await req('GET', '/admin/reports/top-products?limit=5', null, TOKEN);
    check('GET /admin/reports/top-products', topProds, 200);

    const custReport = await req('GET', '/admin/reports/customers?limit=5', null, TOKEN);
    check('GET /admin/reports/customers', custReport, 200, j => j?.data?.topCustomers !== undefined);

    const freqBought = await req('GET', '/admin/reports/frequently-bought', null, TOKEN);
    check('GET /admin/reports/frequently-bought', freqBought, 200);

    const adminOrders = await req('GET', '/orders?limit=10', null, TOKEN);
    check('GET /orders (admin list)', adminOrders, 200);

    const adminUsers = await req('GET', '/users?limit=10', null, TOKEN);
    check('GET /users (admin list)', adminUsers, 200, j => j?.data !== undefined);

    const adminProdsAll = await req('GET', '/products/admin/all?limit=10', null, TOKEN);
    check('GET /products/admin/all', adminProdsAll, 200);

    const adminCatsAll = await req('GET', '/categories/admin/all', null, TOKEN);
    check('GET /categories/admin/all', adminCatsAll, 200);

    const promoAdmin = await req('GET', '/promotions', null, TOKEN);
    check('GET /promotions (admin list)', promoAdmin, 200);

    const cart = await req('GET', '/cart', null, TOKEN);
    check('GET /cart', cart, 200);

    const profile = await req('GET', '/auth/me', null, TOKEN);
    check('GET /auth/me (profile)', profile, 200, j => j?.data?.email !== undefined);

    const invoices = await req('GET', '/invoices?limit=5', null, TOKEN);
    check('GET /invoices (admin)', invoices, 200);

    const recentActivity = await req('GET', '/admin/activity/recent', null, TOKEN);
    check('GET /admin/activity/recent', recentActivity, 200);

    const myOrders = await req('GET', '/orders/my-orders', null, TOKEN);
    check('GET /orders/my-orders', myOrders, 200);
  } else {
    console.log('\n⚠️  Skipping admin routes (no token)');
  }

  console.log('\n=== DONE ===');
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

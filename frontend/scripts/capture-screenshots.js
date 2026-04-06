const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const readline = require("readline");
const { chromium } = require("playwright");

const mode = process.argv[2] || "run";
const baseUrl =
  process.argv[3] ||
  process.env.SCREENSHOT_BASE_URL ||
  "http://localhost:3000";
const outputDir =
  process.argv[4] ||
  path.resolve(__dirname, "..", "..", "docs", "images", "screenshots");
const storageStatePath = path.resolve(
  __dirname,
  "..",
  ".playwright",
  "storage-state.json",
);
const userDataDir = process.env.SCREENSHOT_USER_DATA_DIR || "";
const usePersistentProfile = Boolean(userDataDir);
const orderNumber = process.env.SCREENSHOT_ORDER_NUMBER || "";
const extraWaitMs = Number.parseInt(
  process.env.SCREENSHOT_WAIT_MS || "2000",
  10,
);

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function launchBrowser({ headless }) {
  const preferredChannel = process.env.SCREENSHOT_BROWSER || "msedge";
  try {
    return await chromium.launch({ headless, channel: preferredChannel });
  } catch (error) {
    console.warn(
      `Edge launch failed (${preferredChannel}). Falling back to Chromium: ${error.message}`,
    );
    return chromium.launch({ headless });
  }
}

async function launchPersistentContext() {
  const preferredChannel = process.env.SCREENSHOT_BROWSER || "msedge";
  if (!userDataDir) {
    throw new Error("SCREENSHOT_USER_DATA_DIR is required for profile mode.");
  }
  try {
    return await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: preferredChannel,
      viewport: { width: 1440, height: 900 },
    });
  } catch (error) {
    console.warn(
      `Edge profile launch failed (${preferredChannel}). Falling back to Chromium: ${error.message}`,
    );
    return chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1440, height: 900 },
    });
  }
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getSampleData() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

  const categoriesPayload = await fetchJson(`${apiBase}/categories?limit=200`);
  const categories = categoriesPayload?.data || [];
  const parentCategory = categories.find((c) => !c.parent_id) || null;
  const childCategory = parentCategory
    ? categories.find((c) => c.parent_id === parentCategory.id)
    : null;

  const productsPayload = await fetchJson(`${apiBase}/products?limit=1`);
  const product = productsPayload?.data?.[0] || null;

  return {
    parentCategory,
    childCategory,
    product,
  };
}

async function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Press Enter to continue once login is complete.", () => {
      rl.close();
      resolve();
    });
  });
}

function getLoginWaitMs() {
  const rawSeconds = process.env.SCREENSHOT_LOGIN_WAIT_SECONDS;
  const seconds = rawSeconds ? Number.parseInt(rawSeconds, 10) : 0;
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  if (!process.stdin.isTTY) {
    return 120 * 1000;
  }
  return 0;
}

async function waitForLogin() {
  const waitMs = getLoginWaitMs();
  if (waitMs > 0) {
    console.log(`Waiting ${Math.round(waitMs / 1000)} seconds for login...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return;
  }
  await waitForEnter();
}

async function waitForPageReady(page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {
    // Ignore network idle timeouts for long polling pages.
  }
  if (Number.isFinite(extraWaitMs) && extraWaitMs > 0) {
    await page.waitForTimeout(extraWaitMs);
  }
}

async function capturePage(page, route, fullPath, options = {}) {
  try {
    await page.goto(fullPath, { waitUntil: "domcontentloaded" });
    if (options.adminTab) {
      await page.evaluate((tabId) => {
        localStorage.setItem("adminDashTab", tabId);
      }, options.adminTab);
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    await waitForPageReady(page);
    await page.screenshot({ path: route, fullPage: true });
    return true;
  } catch (error) {
    console.error(`Capture failed for ${fullPath}:`, error.message);
    return false;
  }
}

async function resolveOrderDetailPath(page, base) {
  if (!orderNumber) return null;
  const ordersUrl = `${base}/orders`;
  await page.goto(ordersUrl, { waitUntil: "domcontentloaded" });
  await waitForPageReady(page);

  const link = page.locator(`a:has-text("${orderNumber}")`).first();
  const linkCount = await link.count();
  if (!linkCount) return null;
  const href = await link.getAttribute("href");
  if (!href) return null;
  if (href.startsWith("/")) return href;
  try {
    const url = new URL(href, base);
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

async function runAuthFlow() {
  const loginUrl = `${baseUrl.replace(/\/$/, "")}/login`;

  if (usePersistentProfile) {
    const context = await launchPersistentContext();
    const page = await context.newPage();
    console.log(`Using Edge profile at ${userDataDir}`);
    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    console.log("Log in with Google OAuth, then return here.");
    await waitForLogin();
    await context.close();
    console.log("Edge profile session is ready.");
    return;
  }

  await ensureDir(path.dirname(storageStatePath));
  const browser = await launchBrowser({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("Log in with Google OAuth, then return here.");
  await waitForLogin();
  await context.storageState({ path: storageStatePath });
  await browser.close();
  console.log(`Saved storage state to ${storageStatePath}`);
}

async function runCapture() {
  await ensureDir(outputDir);
  let browser;
  let context;
  let page;

  if (usePersistentProfile) {
    context = await launchPersistentContext();
    page = await context.newPage();
    console.log(`Using Edge profile at ${userDataDir}`);
  } else {
    const hasState = await fileExists(storageStatePath);
    browser = await launchBrowser({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: hasState ? storageStatePath : undefined,
    });
    page = await context.newPage();

    if (!hasState) {
      console.log("No storage state found. Some pages may show login prompts.");
    }
  }

  const base = baseUrl.replace(/\/$/, "");
  const { parentCategory, childCategory, product } = await getSampleData();
  const categorySlug = slugify(parentCategory?.name_en || parentCategory?.name);
  const subcategorySlug = slugify(childCategory?.name_en || childCategory?.name);
  const categoryId = parentCategory?.id || "unknown";
  const productId = product?.id || "unknown";
  const orderDetailPath = await resolveOrderDetailPath(page, base);
  const routes = [
    { name: "home", path: "/" },
    { name: "products", path: "/products" },
    { name: "product-detail", path: `/products/${productId}` },
    { name: "category-parent", path: `/category/${categorySlug}` },
    {
      name: "category-subcategory",
      path: `/category/${categorySlug}/${subcategorySlug}`,
    },
    { name: "category-id", path: `/categories/${categoryId}` },
    { name: "featured", path: "/featured" },
    { name: "hot-deals", path: "/hot-deals" },
    { name: "new-arrivals", path: "/new-arrivals" },
    { name: "recently-updated", path: "/recently-updated" },
    { name: "search", path: "/search?q=rice" },
    { name: "login", path: "/login" },
    { name: "checkout", path: "/checkout" },
    { name: "orders", path: "/orders" },
    ...(orderDetailPath ? [{ name: "order-detail", path: orderDetailPath }] : []),
    { name: "profile", path: "/profile" },
    { name: "profile-settings", path: "/profile/settings" },
    { name: "privacy", path: "/privacy" },
    { name: "terms", path: "/terms" },
    { name: "admin-dashboard", path: "/admin/dashboard" },
    { name: "admin-dashboard-products", path: "/admin/dashboard", adminTab: "products" },
    { name: "admin-dashboard-categories", path: "/admin/dashboard", adminTab: "categories" },
    { name: "admin-dashboard-orders", path: "/admin/dashboard", adminTab: "orders" },
    { name: "admin-dashboard-pricing", path: "/admin/dashboard", adminTab: "pricing" },
    { name: "admin-dashboard-promotions", path: "/admin/dashboard", adminTab: "promotions" },
    { name: "admin-dashboard-users", path: "/admin/dashboard", adminTab: "users" },
    { name: "admin-dashboard-settings", path: "/admin/dashboard", adminTab: "settings" },
    { name: "admin-billing", path: "/admin/billing" },
    { name: "admin-birth-day", path: "/admin/birth-day" },
    { name: "admin-voice-dictionary", path: "/admin/voice-dictionary" },
  ];

  for (const route of routes) {
    const target = `${base}${route.path}`;
    const outputPath = path.join(outputDir, `${route.name}.png`);
    console.log(`Capturing ${target}`);
    await capturePage(page, outputPath, target, route);
  }

  if (browser) {
    await browser.close();
  } else if (context) {
    await context.close();
  }
  console.log(`Screenshots saved in ${outputDir}`);
}

async function main() {
  if (mode === "auth") {
    await runAuthFlow();
    return;
  }

  await runCapture();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

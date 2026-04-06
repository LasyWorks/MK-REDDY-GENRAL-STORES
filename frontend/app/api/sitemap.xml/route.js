const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mkreddygeneralstore.com/";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

const STATIC_URLS = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/products", changefreq: "daily", priority: 0.9 },
  { url: "/categories", changefreq: "weekly", priority: 0.8 },
  { url: "/featured", changefreq: "weekly", priority: 0.8 },
  { url: "/hot-deals", changefreq: "daily", priority: 0.85 },
  { url: "/new-arrivals", changefreq: "daily", priority: 0.8 },
  { url: "/recently-updated", changefreq: "daily", priority: 0.75 },
  { url: "/search", changefreq: "weekly", priority: 0.7 },
  { url: "/about", changefreq: "monthly", priority: 0.6 },
  { url: "/contact", changefreq: "monthly", priority: 0.6 },
  { url: "/privacy", changefreq: "yearly", priority: 0.3 },
  { url: "/terms", changefreq: "yearly", priority: 0.3 },
];

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { cache: "no-store", timeout: 5000 });
      if (response.ok) return response;
    } catch (err) {
      if (i === retries) throw err;
    }
  }
}

async function getCategories() {
  try {
    const res = await fetchWithRetry(`${API_URL}/categories?limit=1000`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).filter((c) => c.id).slice(0, 100);
  } catch {
    return [];
  }
}

async function getProducts() {
  try {
    const res = await fetchWithRetry(`${API_URL}/products?limit=1000&is_active=true`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).filter((p) => p.id).slice(0, 500);
  } catch {
    return [];
  }
}

function generateSitemapXML(urls) {
  const xmlEntries = urls
    .map(
      (item) =>
        `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}

export async function GET() {
  try {
    const now = new Date().toISOString().split("T")[0];
    const urls = [];

    STATIC_URLS.forEach((item) => {
      urls.push({
        loc: `${SITE_URL.replace(/\/$/, "")}${item.url}`,
        lastmod: now,
        changefreq: item.changefreq,
        priority: item.priority,
      });
    });

    const [categories, products] = await Promise.all([getCategories(), getProducts()]);

    categories.forEach((category) => {
      urls.push({
        loc: `${SITE_URL.replace(/\/$/, "")}/category/${category.id}`,
        lastmod: category.updated_at ? category.updated_at.split("T")[0] : now,
        changefreq: "weekly",
        priority: 0.7,
      });
    });

    products.forEach((product) => {
      urls.push({
        loc: `${SITE_URL.replace(/\/$/, "")}/products/${product.id}`,
        lastmod: product.updated_at ? product.updated_at.split("T")[0] : now,
        changefreq: "weekly",
        priority: product.hot_deal ? 0.75 : 0.6,
      });
    });

    const sitemapXML = generateSitemapXML(urls);

    return new Response(sitemapXML, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    const fallbackXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXML, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300",
      },
    });
  }
}

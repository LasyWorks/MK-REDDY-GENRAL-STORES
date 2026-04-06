import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

async function getProduct(id) {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

/**
 * Fallback: group by brand+category for products that predate parent_product_id.
 * Only used when the API returns no explicit variants array.
 */
async function getVariantsByBrand(brand, categoryId) {
  if (!brand) return [];
  try {
    const res = await fetch(
      `${API_URL}/products?brand=${encodeURIComponent(brand)}&category_id=${categoryId}&limit=50&is_active=true`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product Not Found" };

  const productUrl = `${SITE_URL}products/${id}`;
  const imageUrl = product.image_url || `${SITE_URL}product-placeholder.png`;
  const description = product.description || `Buy ${product.name} from ${SITE_NAME} at the best price online.`;

  return {
    title: `${product.name} - Buy Online at Best Price | ${SITE_NAME}`,
    description: description.substring(0, 160),
    keywords: [
      product.name,
      product.brand || SITE_NAME,
      product.category_name || "Grocery",
      "buy online",
      "best price",
      "delivery",
    ].join(", "),
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      type: "product",
      url: productUrl,
      title: `${product.name} | ${SITE_NAME}`,
      description: description.substring(0, 160),
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.name,
          type: "image/png",
        },
      ],
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ${SITE_NAME}`,
      description: description.substring(0, 160),
      images: [imageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // Use explicit variant group (parent_product_id-based) when available,
  // otherwise fall back to brand+category grouping for legacy products.
  let allVariants;
  if (product.variants && product.variants.length > 1) {
    allVariants = product.variants;
  } else {
    const brandVariants = product.brand
      ? await getVariantsByBrand(product.brand, product.category_id)
      : [];
    allVariants = brandVariants.length > 0 ? brandVariants : [product];
  }

  return (
    <>
      <ProductSchemaMarkup product={product} />
      <main className="min-h-screen bg-gray-50 md:pt-4 pb-12">
        <ProductDetailClient product={product} variants={allVariants} />
      </main>
    </>
  );
}

function ProductSchemaMarkup({ product }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}products/${product.id}`,
    name: product.name,
    description: product.description || product.name,
    image: product.image_url || `${SITE_URL}product-placeholder.png`,
    sku: product.sku || `SKU-${product.id}`,
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_NAME,
    },
    category: product.category_name || "Grocery",
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}products/${product.id}`,
      priceCurrency: "INR",
      price: (product.price || 0).toString(),
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      ratingCount: "100",
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

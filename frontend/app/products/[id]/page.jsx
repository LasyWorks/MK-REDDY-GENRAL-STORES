import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

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

async function getVariants(brand, categoryId) {
  if (!brand) return [];
  try {
    const res = await fetch(
      `${API_URL}/products?brand=${encodeURIComponent(brand)}&category_id=${categoryId}&limit=50&is_active=true`,
      { cache: "no-store" }
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
  return {
    title: `${product.name} – MK Reddy General Store`,
    description: product.description || `Buy ${product.name} at the best price.`,
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // Fetch variant siblings if there's a brand
  const variants = product.brand
    ? await getVariants(product.brand, product.category_id)
    : [product];

  // De-duplicate and include current product if for some reason API missed it
  const allVariants = variants.length > 0 ? variants : [product];

  return (
    <main className="min-h-screen bg-gray-50 pt-4 pb-12">
      <ProductDetailClient product={product} variants={allVariants} />
    </main>
  );
}

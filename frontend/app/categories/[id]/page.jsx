import { notFound } from "next/navigation";
import CategoryClientView from "../../../components/category/CategoryClientView";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

// ─── Server-side data helpers ──────────────────────────────────────────────

async function getAllCategories() {
  try {
    const res = await fetch(`${API_URL}/categories?limit=200&is_active=true`, {
      next: { tags: ['categories'], revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function getCategoryById(id) {
  try {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      next: { tags: ['categories', `category-${id}`], revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch {
    return null;
  }
}

// ─── Static generation ─────────────────────────────────────────────────────

/**
 * Pre-build a page for every MAIN category at build time.
 * Subcategory IDs are NOT listed here — they are rendered on-demand
 * (dynamicParams = true below).
 */
export async function generateStaticParams() {
  const categories = await getAllCategories();
  const mainCategories = categories.filter((c) => !c.parent_id);
  return mainCategories.map((c) => ({ id: c.id }));
}

/**
 * Allow subcategory IDs (not in generateStaticParams) to be
 * rendered on-demand the first time they're visited, then cached.
 */
export const dynamicParams = true;

// ─── Page metadata ─────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { id } = await params;
  const category = await getCategoryById(id);
  return {
    title: category?.name ? `${category.name} | MK Reddy Stores` : "Category",
    description: category?.description || "Browse products in this category",
  };
}

// ─── Server Component ──────────────────────────────────────────────────────

/**
 * Runs on the server (or at build time for main categories).
 * Fetches category structure server-side, passes data to
 * CategoryClientView which handles interactivity and lazy-loads products.
 */
export default async function CategoryPage({ params }) {
  const { id } = await params;

  // Parallel server fetch
  const [category, allCategories] = await Promise.all([
    getCategoryById(id),
    getAllCategories(),
  ]);

  if (!category) notFound();

  let mainCategory;
  let subcategories;
  let initialActiveSubcategory;

  if (!category.parent_id) {
    mainCategory = category;
    subcategories = allCategories.filter(
      (c) => c.parent_id === mainCategory.id,
    );
    initialActiveSubcategory = subcategories[0] || null;
  } else {
    mainCategory =
      allCategories.find((c) => c.id === category.parent_id) || category;
    subcategories = allCategories.filter(
      (c) => c.parent_id === mainCategory.id,
    );
    initialActiveSubcategory = category;
  }

  return (
    <CategoryClientView
      mainCategory={mainCategory}
      subcategories={subcategories}
      initialActiveSubcategory={initialActiveSubcategory}
    />
  );
}

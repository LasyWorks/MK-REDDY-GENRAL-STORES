import { notFound } from "next/navigation";
import CategoryClientView from "../../../components/category/CategoryClientView";
import { getAllCategories, getCategoryById } from "../../data/categories";

// ─── Static generation ─────────────────────────────────────────────────────

/**
 * Pre-build pages for ALL categories (main + subcategories) at build time.
 * Every ID gets a static HTML file — 0ms render on every request.
 * New categories added after build are handled on first visit (dynamicParams=true)
 * then immediately rebuilt via on-demand ISR when the backend pings /api/revalidate.
 */
export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((c) => ({ id: c.id }));
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

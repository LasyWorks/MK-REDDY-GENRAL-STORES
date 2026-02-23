import { notFound } from "next/navigation";
import CategoryClientView from "../../../components/category/CategoryClientView";
import { getAllCategories } from "../../data/categories";

// ─── Route-level static directives ────────────────────────────────────────
//
// WHY force-static:
//   Tells Next.js this route MUST be pre-rendered. If anything tries to
//   make it dynamic at runtime (cookies, headers, searchParams), Next.js
//   throws a build error instead of silently falling back to SSR.
//   This guarantees CDN-cached HTML — sub-10ms TTFB in production.
//
// WHY revalidate = 3600:
//   Belt-and-suspenders fallback. If the backend can't reach the
//   /api/revalidate endpoint (e.g. network blip), pages auto-refresh
//   within 1 hour. On-demand ISR still fires immediately when the
//   backend pings us.
//
// WHY dynamicParams = true:
//   A new category added after the last build gets rendered on the first
//   request, cached as static HTML, then stays fresh via on-demand ISR.
//   Without this, new categories would 404 until the next full build.

export const dynamic = "force-static";
export const revalidate = 3600;
export const dynamicParams = true;

// ─── Static generation ─────────────────────────────────────────────────────
//
// WHY single getAllCategories() call:
//   We fetch all categories once. unstable_cache in data/categories.js
//   memoises this at process level — every subsequent call in the same
//   build/request is a Map lookup (~0ms). No second network round-trip
//   for individual category IDs is ever needed.
//
//   Build-time side-effect: getAllCategories() warm-primes the
//   unstable_cache for every category ID before individual pages render,
//   so generateMetadata and CategoryPage below both read from memory.

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((c) => ({ id: c.id }));
}

// ─── Metadata ──────────────────────────────────────────────────────────────
//
// WHY no getCategoryById call here:
//   getAllCategories() is already in unstable_cache from the
//   generateStaticParams call above. Finding by id is a JS .find() —
//   zero network, zero DB, ~0ms.

export async function generateMetadata({ params }) {
  const { id } = await params;
  const categories = await getAllCategories();
  const category = categories.find((c) => c.id === id);
  return {
    title: category?.name
      ? `${category.name} | MK Reddy General Stores`
      : "Category | MK Reddy General Stores",
    description:
      category?.description ||
      `Shop ${category?.name || "products"} at MK Reddy General Stores`,
    openGraph: {
      title: category?.name ?? "Category",
      description: category?.description ?? "",
      images: category?.image_url ? [{ url: category.image_url }] : [],
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────
//
// WHY single getAllCategories() call instead of getCategoryById + getAllCategories:
//   Previous version made two cache lookups per page (getCategoryById +
//   getAllCategories). Now we make one — derive the single category from
//   the already-cached full list with .find(). Eliminates one
//   unstable_cache key lookup and one potential stale-state divergence.
//
// WHY no Promise.all here:
//   Both calls hit the same unstable_cache key ('all-categories').
//   Parallelising them doesn't help — the second would just wait for
//   the first to populate the cache anyway.

export default async function CategoryPage({ params }) {
  const { id } = await params;

  // One cache read. derive everything from it.
  const allCategories = await getAllCategories();
  const category = allCategories.find((c) => c.id === id);

  if (!category) notFound();

  let mainCategory;
  let subcategories;
  let initialActiveSubcategory;

  if (!category.parent_id) {
    // Visiting a main category (e.g. "Household Care")
    mainCategory = category;
    subcategories = allCategories.filter((c) => c.parent_id === mainCategory.id);
    initialActiveSubcategory = subcategories[0] ?? null;
  } else {
    // Visiting a subcategory directly (e.g. "Laundry Detergent")
    mainCategory = allCategories.find((c) => c.id === category.parent_id) ?? category;
    subcategories = allCategories.filter((c) => c.parent_id === mainCategory.id);
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

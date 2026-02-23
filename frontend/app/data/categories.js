/**
 * data/categories.js
 *
 * Single source of truth for category data.
 *
 * unstable_cache wraps the fetcher with Next.js's server-side persistent cache:
 *   - Build time:        fetches once, stores in cache → all generateStaticParams
 *                        + generateMetadata + page renders read from memory
 *   - Production runtime: cache is populated on first request, then served
 *                         from memory (~0ms) until revalidateTag('categories')
 *                         is called by the backend on any category change
 *   - Fallback:          revalidate: 3600 ensures pages auto-refresh within
 *                        1 hour even if the on-demand ping never arrives
 */

import { unstable_cache } from 'next/cache';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

async function _getAllCategories() {
  const res = await fetch(
    `${API_URL}/categories?limit=200&is_active=true`,
    { next: { tags: ['categories'], revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

/**
 * Returns all active categories (main + subcategories).
 *
 * This is the ONLY fetch the entire category section needs.
 * Individual category lookups (by ID, by parent) are plain JS .find()/.filter()
 * on the returned array — no extra network calls ever.
 *
 * Invalidated instantly by revalidateTag('categories') from the backend.
 */
export const getAllCategories = unstable_cache(
  async () => {
    try {
      return await _getAllCategories();
    } catch {
      return [];
    }
  },
  ['all-categories'],
  { tags: ['categories'] },
);


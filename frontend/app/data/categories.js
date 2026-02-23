/**
 * data/categories.js
 *
 * Cached data-fetching layer for categories.
 *
 * unstable_cache wraps each function with Next.js's server-side LRU cache.
 * - First call in a process: hits the API (~100ms)
 * - Every call after:        returns from memory (~0ms)
 * - revalidateTag('categories') or revalidateTag('category-<id>')
 *   instantly busts the relevant entries — ISR still works exactly as before.
 */

import { unstable_cache } from 'next/cache';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

// ─── Raw fetchers (not cached themselves) ───────────────────────────────────

async function _getAllCategories() {
  const res = await fetch(
    `${API_URL}/categories?limit=200&is_active=true`,
    // Still keep the time-based fallback (1 hour) for edge cases
    // where the backend couldn't ping the revalidation endpoint
    { next: { tags: ['categories'], revalidate: 3600 } },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function _getCategoryById(id) {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    next: { tags: ['categories', `category-${id}`], revalidate: 3600 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

// ─── Cached exports ─────────────────────────────────────────────────────────

/**
 * Returns all active categories.
 * Cached in memory until 'categories' tag is invalidated.
 */
export const getAllCategories = unstable_cache(
  async () => {
    try {
      return await _getAllCategories();
    } catch {
      return [];
    }
  },
  ['all-categories'],          // cache key
  { tags: ['categories'] },    // invalidation tag
);

/**
 * Returns a single category by ID.
 * Cached per-ID until 'category-<id>' tag is invalidated.
 */
export const getCategoryById = unstable_cache(
  async (id) => {
    try {
      return await _getCategoryById(id);
    } catch {
      return null;
    }
  },
  ['category-by-id'],                                // cache key prefix
  { tags: ['categories'] },                          // invalidated with any category change
);

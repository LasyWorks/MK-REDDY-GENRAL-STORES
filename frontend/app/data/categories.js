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

/**
 * Always fetches fresh category data (no cache).
 * Use this in force-dynamic pages so product_count reflects
 * product moves / deactivations immediately after a refresh.
 */
export async function getFreshCategories() {
  try {
    const res = await fetch(
      `${API_URL}/categories?limit=200&is_active=true`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

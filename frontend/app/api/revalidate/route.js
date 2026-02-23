import { revalidateTag, revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * POST /api/revalidate
 *
 * Called by the Express backend whenever an admin creates, updates, or
 * deletes a category or product.  Next.js will immediately discard the
 * stale cached HTML and regenerate fresh pages on the next request
 * (or the moment revalidatePath rebuilds them in the background).
 *
 * Body:
 *   { secret: string, tags?: string[], paths?: string[] }
 *
 * Tags used by the app:
 *   "categories"          → all category listing pages
 *   "category-<id>"       → single category page
 *   "products"            → all product listing pages
 *   "product-<id>"        → single product page
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { secret, tags = [], paths = [] } = body;

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    for (const tag of tags) {
      revalidateTag(tag);
    }

    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({
      revalidated: true,
      tags,
      paths,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

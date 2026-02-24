/**
 * proxyImg(url) — rewrite third-party image URLs to go through our own
 * /api/img proxy so browser tracking prevention never blocks them.
 *
 * Usage:
 *   import proxyImg from "@/lib/imgProxy";
 *   <Image src={proxyImg(product.image_url)} ... />
 *
 * • Supabase URLs are already first-party — returned unchanged.
 * • Relative / data URIs are returned unchanged.
 * • Everything else (Amazon CDN, Google images, etc.) is proxied.
 */

const BYPASS_PATTERNS = [
  /^\//, // relative
  /^data:/, // data URI
  /supabase\.co/, // our own Supabase bucket
  /localhost/, // local dev assets
];

export default function proxyImg(url) {
  if (!url) return "/placeholder-product.png";
  if (BYPASS_PATTERNS.some((re) => re.test(url))) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

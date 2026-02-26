const BYPASS_PATTERNS = [
  /^\
  /^data:/, 
  /supabase\.co/, 
  /localhost/, 
];
export default function proxyImg(url) {
  if (!url) return "/placeholder-product.png";
  if (BYPASS_PATTERNS.some((re) => re.test(url))) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}
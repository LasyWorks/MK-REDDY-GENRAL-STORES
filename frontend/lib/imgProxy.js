const BYPASS_PATTERNS = [
  /^https?:\/\//,
  /^data:/, 
  /supabase\.co/, 
  /localhost/, 
];
export default function proxyImg(url) {
  if (!url) return "/placeholder-product.png";
  if (BYPASS_PATTERNS.some((re) => re.test(url))) {
    // Upgrade http:// to https:// to prevent mixed-content warnings
    if (url.startsWith("http://")) return url.replace(/^http:\/\//, "https://");
    return url;
  }
  return `/api/img?url=${encodeURIComponent(url)}`;
}

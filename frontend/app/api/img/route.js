const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
];
const CACHE_SECONDS = 60 * 60 * 24 * 30;
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");
  if (!raw) {
    return new Response("Missing url parameter", { status: 400 });
  }
  let target;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response("Only HTTP/HTTPS URLs are allowed", { status: 403 });
  }
  // Always upgrade to HTTPS to avoid mixed-content issues
  if (target.protocol === "http:") {
    target.protocol = "https:";
  }
  if (BLOCKED_HOSTS.some((re) => re.test(target.hostname))) {
    return new Response("Host not allowed", { status: 403 });
  }
  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.amazon.in/",
      },
      redirect: "follow",
    });
    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400, immutable`,
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (err) {
    console.error("[img-proxy] fetch failed:", err.message);
    return new Response("Failed to fetch image", { status: 502 });
  }
}

/**
 * Server-side proxy for SerpAPI image search.
 * Keeps the API key out of the browser bundle.
 *
 * Usage: GET /api/category-image?q=vegetables
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "grocery";
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey || apiKey === "your_serpapi_key_here") {
    return Response.json({ url: null, error: "SERPAPI_KEY not configured" });
  }

  try {
    const serpUrl =
      `https://serpapi.com/search.json` +
      `?engine=google_images` +
      `&q=${encodeURIComponent(q + " grocery store india")}` +
      `&num=3` +
      `&ijn=0` +
      `&api_key=${apiKey}`;

    const res = await fetch(serpUrl, { next: { revalidate: 86400 } }); // cache 24 h
    if (!res.ok) throw new Error(`SerpAPI responded ${res.status}`);

    const data = await res.json();
    const images = data.images_results || [];

    // Pick first result with a usable original URL
    const best = images.find((img) => img.original?.startsWith("http")) || images[0];
    const url = best?.original || best?.thumbnail || null;

    return Response.json({ url });
  } catch (err) {
    console.error("[category-image]", err.message);
    return Response.json({ url: null });
  }
}

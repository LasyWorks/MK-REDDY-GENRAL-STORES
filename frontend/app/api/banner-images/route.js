import { NextResponse } from "next/server";

// Three keys — rotate across all three
const SERP_KEYS = [
  process.env.SERPAPI_KEY,
  process.env.SERPAPI_KEY_2,
  process.env.SERPAPI_KEY_3,
].filter(Boolean);

// Track which keys have hit rate limits
const keyStatuses = new Map();
let currentKeyIndex = 0;

function getNextAvailableKey() {
  const now = Date.now();
  // Reset keys after 1 hour
  for (const [key, status] of keyStatuses.entries()) {
    if (now - status.blockedAt > 3600000) {
      keyStatuses.delete(key);
    }
  }

  // Try all keys
  for (let i = 0; i < SERP_KEYS.length; i++) {
    const index = (currentKeyIndex + i) % SERP_KEYS.length;
    const key = SERP_KEYS[index];
    if (!keyStatuses.has(key)) {
      currentKeyIndex = (index + 1) % SERP_KEYS.length;
      return { key, index };
    }
  }
  return null; // All keys exhausted
}

function markKeyBlocked(key) {
  keyStatuses.set(key, { blockedAt: Date.now() });
}

/**
 * Search for banner images using SERP API
 * Returns multiple image results for user to choose from
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const num = parseInt(searchParams.get("num") || "12");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  if (SERP_KEYS.length === 0) {
    return NextResponse.json({ 
      error: "SERP API keys not configured",
      userMessage: "Image search is not available. Please contact administrator."
    }, { status: 500 });
  }

  const keyData = getNextAvailableKey();
  if (!keyData) {
    return NextResponse.json({ 
      error: "All SERP API keys have reached rate limits",
      userMessage: "Image search quota exceeded. Please try again in an hour or use direct image URLs.",
      retryAfter: 3600
    }, { status: 429 });
  }

  try {
    const url =
      `https://serpapi.com/search.json?engine=google_images` +
      `&q=${encodeURIComponent(query)}` +
      `&num=${num}` +
      `&ijn=0` +
      `&api_key=${keyData.key}`;

    const res = await fetch(url, { cache: "no-store" });
    
    if (res.status === 429) {
      markKeyBlocked(keyData.key);
      console.warn(`SERP API key ${keyData.index + 1} hit rate limit`);
      
      // Try next key if available
      const nextKey = getNextAvailableKey();
      if (nextKey) {
        console.log(`Retrying with key ${nextKey.index + 1}`);
        return GET(request); // Recursive retry
      }
      
      return NextResponse.json({ 
        error: "Rate limit exceeded on all API keys",
        userMessage: "Image search quota exceeded. Please try again later or enter image URLs manually.",
        retryAfter: 3600
      }, { status: 429 });
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error("SERP API error:", res.status, errorText);
      return NextResponse.json({ 
        error: "Failed to fetch images from SERP API",
        userMessage: "Unable to search images. Please try again or enter image URLs manually.",
        details: errorText
      }, { status: res.status });
    }

    const json = await res.json();
    
    // Check for API-level errors
    if (json.error) {
      console.error("SERP API returned error:", json.error);
      return NextResponse.json({ 
        error: json.error,
        userMessage: "Image search failed. Please try a different search term or use direct URLs."
      }, { status: 400 });
    }

    const imgs = json.images_results || [];

    // Transform results to a simpler format
    const results = imgs.map((img, index) => ({
      id: index,
      url: img.original || img.thumbnail,
      thumbnail: img.thumbnail,
      title: img.title || "",
      source: img.source || "",
    })).filter(img => img.url);

    return NextResponse.json({ 
      query,
      results,
      total: results.length,
      keyUsed: keyData.index + 1,
      totalKeys: SERP_KEYS.length
    });

  } catch (error) {
    console.error("Banner image search error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      userMessage: "An unexpected error occurred. Please try again.",
      message: error.message 
    }, { status: 500 });
  }
}

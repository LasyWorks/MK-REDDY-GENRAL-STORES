import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Next.js telemetry (stops the "host not in insights whitelist" console noise)
  // You can also add NEXT_TELEMETRY_DISABLED=1 to .env.local
  experimental: {},
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // Supabase storage
      { protocol: "https", hostname: "**.supabase.co" },
      // SerpAPI / Google image CDNs
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
      { protocol: "https", hostname: "encrypted-tbn1.gstatic.com" },
      { protocol: "https", hostname: "encrypted-tbn2.gstatic.com" },
      { protocol: "https", hostname: "encrypted-tbn3.gstatic.com" },
      // Cloudinary / any generic CDN (open wildcard for convenience)
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;

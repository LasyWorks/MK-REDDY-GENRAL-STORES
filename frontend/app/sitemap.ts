import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

const now = new Date();

const staticRoutes = [
  "/",
  "/categories",
  "/products",
  "/featured",
  "/hot-deals",
  "/new-arrivals",
  "/recently-updated",
  "/search",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return staticRoutes.map((pathname) => ({
    url: new URL(pathname, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: pathname === "/" ? "daily" : "weekly",
    priority: pathname === "/" ? 1 : 0.7,
  }));
}
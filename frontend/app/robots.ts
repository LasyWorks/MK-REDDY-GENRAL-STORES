import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

const privatePaths = [
  "/admin",
  "/api",
  "/checkout",
  "/login",
  "/orders",
  "/profile",
  "/register",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
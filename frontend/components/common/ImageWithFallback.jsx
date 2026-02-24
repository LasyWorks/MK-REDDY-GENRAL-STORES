"use client";

import { useState, memo } from "react";
import proxyImg from "@/lib/imgProxy";

/**
 * Generates a consistent background color from a string (category/product name).
 * Same name always gets the same color — no randomness.
 */
function colorFromString(str = "") {
  const palette = [
    "#16a34a", // green-600
    "#0891b2", // cyan-600
    "#7c3aed", // violet-600
    "#db2777", // pink-600
    "#ea580c", // orange-600
    "#0284c7", // sky-600
    "#65a30d", // lime-600
    "#dc2626", // red-600
    "#9333ea", // purple-600
    "#0d9488", // teal-600
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * ImageWithFallback
 *
 * Renders an <img> if src is provided and valid.
 * Falls back to a styled colored circle with initials if:
 *   - src is empty / null / undefined
 *   - the image URL returns a 404 or network error
 *
 * Props:
 *   src       - image URL (optional)
 *   alt       - alt text / used to derive initials and color
 *   className - applied to <img> only
 *   size      - "sm" | "md" | "lg" — controls fallback font size (default "md")
 */
function ImageWithFallback({ src, alt = "", className = "", size = "md" }) {
  const [failed, setFailed] = useState(false);

  const fontSizeMap = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };
  const fontSize = fontSizeMap[size] || "text-lg";

  // Derive initials: up to 2 words
  const initials = alt
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  const bgColor = colorFromString(alt);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center rounded-lg select-none ${fontSize} font-bold text-white`}
        style={{ backgroundColor: bgColor }}
        aria-label={alt}
      >
        {initials || "?"}
      </div>
    );
  }

  return (
    <img
      src={proxyImg(src)}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default memo(ImageWithFallback);

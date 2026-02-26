"use client";
import { useState, memo } from "react";
import proxyImg from "@/lib/imgProxy";
function colorFromString(str = "") {
  const palette = [
    "#16a34a", 
    "#0891b2", 
    "#7c3aed", 
    "#db2777", 
    "#ea580c", 
    "#0284c7", 
    "#65a30d", 
    "#dc2626", 
    "#9333ea", 
    "#0d9488", 
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}
function ImageWithFallback({ src, alt = "", className = "", size = "md" }) {
  const [failed, setFailed] = useState(false);
  const fontSizeMap = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };
  const fontSize = fontSizeMap[size] || "text-lg";
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
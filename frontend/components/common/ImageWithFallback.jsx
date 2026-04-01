"use client";
import { useMemo, useState, memo } from "react";
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

function isSlowConnection() {
  if (typeof navigator === "undefined" || !navigator.connection) return false;
  const type = navigator.connection.effectiveType;
  return type === "slow-2g" || type === "2g" || type === "3g";
}

function ImageWithFallback({
  src,
  alt = "",
  className = "",
  size = "md",
  priority = false,
  width,
  height,
  centered = false,
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fontSizeMap = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };
  const fontSize = fontSizeMap[size] || "text-lg";
  const imgSrc = useMemo(() => proxyImg(src), [src]);
  const fetchPriority = priority ? "high" : isSlowConnection() ? "low" : "auto";

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
    <div
      className={`relative w-full h-full overflow-hidden ${centered ? "flex items-center justify-center" : ""}`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-slate-200/80 animate-pulse" aria-hidden="true" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={fetchPriority}
        decoding="async"
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
export default memo(ImageWithFallback);

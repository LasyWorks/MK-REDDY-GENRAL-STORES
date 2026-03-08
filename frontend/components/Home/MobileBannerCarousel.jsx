"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const BANNERS = [
  {
    id: 1,
    bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    accent: "#16A34A",
    tag: "FARM FRESH",
    tagBg: "bg-[#16A34A]",
    headline: "Fresh Vegetables",
    subline: "Buy 2 Get 1 Free",
    desc: "Hand-picked, locally sourced vegetables delivered fresh.",
    cta: "Shop Now",
    ctaHref: "/category/vegetables",
    emoji: "🥦",
  },
  {
    id: 2,
    bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    accent: "#FF6B00",
    tag: "SUPER SAVER",
    tagBg: "bg-[#FF6B00]",
    headline: "Organic Essentials",
    subline: "Flat 25% Off",
    desc: "Pesticide-free grains, pulses & cold-pressed oils.",
    cta: "Shop Organic",
    ctaHref: "/category/organic",
    emoji: "🌾",
  },
  {
    id: 3,
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    accent: "#2563EB",
    tag: "DAILY DEALS",
    tagBg: "bg-[#2563EB]",
    headline: "Pure & Fresh Dairy",
    subline: "Flat 30% Off",
    desc: "Quality dairy products at the lowest prices guaranteed.",
    cta: "Shop Dairy",
    ctaHref: "/category/dairy",
    emoji: "🥛",
  },
  {
    id: 4,
    bg: "linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)",
    accent: "#9333EA",
    tag: "NEW ARRIVALS",
    tagBg: "bg-[#9333EA]",
    headline: "Snacks & Beverages",
    subline: "Up to 40% Off",
    desc: "Your favourite munchies and drinks at unbeatable prices.",
    cta: "Explore Now",
    ctaHref: "/category/snacks",
    emoji: "🍿",
  },
];

const AUTO_PLAY_MS = 3500;

export default function MobileBannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const timerRef = useRef(null);
  const trackRef = useRef(null);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % BANNERS.length),
    [],
  );
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + BANNERS.length) % BANNERS.length),
    [],
  );

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_PLAY_MS);
  }, [next]);

  useEffect(() => {
    timerRef.current = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [next]);

  // Touch swipe handlers
  const onTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setDragDelta(0);
    clearInterval(timerRef.current);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    setDragDelta(e.touches[0].clientX - startX);
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    if (dragDelta < -50) {
      next();
    } else if (dragDelta > 50) {
      prev();
    }
    setDragDelta(0);
    resetTimer();
  };

  const goTo = (idx) => {
    setCurrent(idx);
    resetTimer();
  };

  const banner = BANNERS[current];

  return (
    <section className="md:hidden px-3 pt-2 pb-3">
      <div
        className="relative overflow-hidden rounded-2xl select-none"
        style={{
          background: banner.bg,
          height: "185px",
          transition: "background 0.4s ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        ref={trackRef}
      >
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-between p-4">
          {/* Left text content */}
          <div className="flex-1 pr-2">
            {/* Tag badge */}
            <span
              className={`inline-block text-white text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full mb-2 ${banner.tagBg}`}
            >
              {banner.tag}
            </span>

            {/* Headlines */}
            <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
              {banner.headline}
            </h2>
            <p
              className="text-base font-bold mb-1.5"
              style={{ color: banner.accent }}
            >
              {banner.subline}
            </p>
            <p className="text-[11px] text-gray-600 leading-snug mb-3 line-clamp-2">
              {banner.desc}
            </p>

            {/* CTA */}
            <Link
              href={banner.ctaHref}
              className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md active:scale-95 transition-transform duration-150"
              style={{ backgroundColor: banner.accent }}
            >
              {banner.cta}
            </Link>
          </div>

          {/* Right: large emoji */}
          <div
            className="text-7xl leading-none shrink-0 transition-transform duration-300"
            style={{ filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.12))" }}
          >
            {banner.emoji}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-4 h-1.5 bg-gray-800"
                  : "w-1.5 h-1.5 bg-gray-400/60"
              }`}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

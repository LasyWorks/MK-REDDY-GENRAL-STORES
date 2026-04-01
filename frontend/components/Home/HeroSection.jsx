"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  BoltIcon,
  FireIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  HomeIcon,
  GiftIcon,
  BellIcon,
  CubeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePromotions } from "@/context/PromotionContext";

/* ── Slide data ─────────────────────────────────────── */
const NOW = Date.now();
const slides = [
  {
    id: 1,
    type: "standard",
    bg: "#f9f6ef",
    badge: { Icon: BoltIcon, text: "SUPER SAVER" },
    badgeStyle: "bg-gray-900 text-white",
    headingLine1: "Organic Essentials:",
    headingLine2: "Flat 25% Off",
    headingColor: "text-gray-900",
    desc: "Pesticide-free grains, pulses, and cold-pressed oils for your family.",
    primaryBtn: { label: "Shop Organic", href: "/category/organic", Icon: ShoppingBagIcon },
    secondaryBtn: { label: "View Bundles →", href: "/products" },
    accentColor: "#1a4731",
    timerMode: "dhm",
    timerEnd: NOW + 12 * 3600_000 + 30 * 60_000 + 45_000,
    illustration: [SparklesIcon, ShieldCheckIcon, TagIcon, CubeIcon, StarIcon, ShoppingBagIcon],
    illustrationBg: "#e8f5e9",
  },
  {
    id: 3,
    type: "standard",
    bg: "#f0fdf4",
    badge: { Icon: SparklesIcon, text: "FARM FRESH" },
    badgeStyle: "bg-green-800 text-white",
    headingLine1: "Fresh Vegetables",
    headingLine2: "Buy 2 Get 1 Free",
    headingColor: "text-gray-900",
    desc: "Locally sourced, hand-picked seasonal vegetables delivered straight from farms to your door.",
    primaryBtn: { label: "Shop Vegetables", href: "/category/vegetables", Icon: SparklesIcon },
    secondaryBtn: { label: "View All →", href: "/products" },
    accentColor: "#14532d",
    timerMode: "dhm",
    timerEnd: NOW + 24 * 3600_000 + 8 * 3600_000,
    illustration: [SparklesIcon, ShoppingBagIcon, TagIcon, ShieldCheckIcon, CubeIcon, StarIcon],
    illustrationBg: "#dcfce7",
  },
  {
    id: 4,
    type: "standard",
    bg: "#eff6ff",
    badge: { Icon: StarIcon, text: "DAILY ESSENTIALS" },
    badgeStyle: "bg-blue-900 text-white",
    headingLine1: "Pure & Fresh Dairy",
    headingLine2: "Flat 30% Off",
    headingColor: "text-gray-900",
    desc: "Quality dairy products, eggs, and everyday staples at the lowest prices guaranteed.",
    primaryBtn: { label: "Shop Dairy", href: "/category/dairy", Icon: StarIcon },
    secondaryBtn: { label: "View Offers →", href: "/products" },
    accentColor: "#1e3a8a",
    timerMode: "dhm",
    timerEnd: NOW + 20 * 3600_000,
    illustration: [HomeIcon, ShoppingBagIcon, ShieldCheckIcon, TagIcon, CubeIcon, StarIcon],
    illustrationBg: "#dbeafe",
  },
];

/* ── Build a festival slide from live promo data ─────── */
function buildFestivalSlide(promo) {
  const accentColor = promo.theme_color || "#c05621";
  const discountText =
    promo.discount_type === "percentage"
      ? `Up to ${parseFloat(promo.discount_value || 0)}% Off`
      : `Flat ₹${parseFloat(promo.discount_value || 0)} Off`;
  return {
    id: `promo-${promo.id}`,
    type: "festival",
    bg: "#fff4e6",
    badge: { Icon: FireIcon, text: promo.badge_text || "FESTIVAL SPECIAL" },
    badgeStyle: "bg-orange-100 text-orange-700 border border-orange-200",
    title: promo.title || "Festival Sale",
    discountText,
    desc:
      promo.description ||
      "Get the best deals on festive essentials this season.",
    primaryBtn: { label: "Shop Now", href: "/products", Icon: FireIcon },
    secondaryBtn: { label: "View Offers", href: "/products" },
    accentColor,
    timerEnd: new Date(promo.ends_at).getTime(),
    illustration: [FireIcon, GiftIcon, BellIcon, StarIcon, SparklesIcon, BoltIcon],
    illustrationBg: "#fff3cd",
  };
}

/* ── Countdown hook ──────────────────────────────────── */
function useCountdown(endTime) {
  const calc = () => {
    const diff = Math.max(0, endTime - Date.now());
    return {
      d: Math.floor(diff / 86_400_000),
      h: Math.floor((diff % 86_400_000) / 3_600_000),
      m: Math.floor((diff % 3_600_000) / 60_000),
      s: Math.floor((diff % 60_000) / 1_000),
    };
  };
  // Start with zeros to match server render — client takes over after mount
  const [t, setT] = useState(() => calc());
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return t;
}
const pad = (n) => String(n).padStart(2, "0");

/* ── Timer D/H/M ─────────────────────────────────────── */
function TimerDHM({ endTime, accentColor }) {
  const { d, h, m } = useCountdown(endTime);
  return (
    <div className="flex items-end gap-3 mt-4">
      {[
        { val: pad(d), label: "Days" },
        { val: pad(h), label: "Hours" },
        { val: pad(m), label: "Mins" },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 bg-white text-gray-800"
            style={{ borderColor: accentColor }}
          >
            {val}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Timer H:M:S ─────────────────────────────────────── */
function TimerHMS({ endTime }) {
  const { h, m, s } = useCountdown(endTime);
  const timerItems = [
    { val: pad(h), label: "HOURS", accent: false },
    { val: pad(m), label: "MINS", accent: false },
    { val: pad(s), label: "SECS", accent: true },
  ];
  return (
    <div className="flex items-center gap-1 mt-4">
      {timerItems.map(({ val, label, accent }, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-bold border border-gray-200 bg-white shadow-sm ${
                accent ? "text-green-500" : "text-gray-800"
              }`}
            >
              {val}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 font-semibold tracking-widest">
              {label}
            </span>
          </div>
          {i < timerItems.length - 1 && (
            <span className="text-2xl font-bold text-gray-400 mb-5 select-none">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Illustration panel ──────────────────────────────── */
function Illustration({ slide }) {
  const icons = slide.illustration;
  return (
    <div
      className="hidden md:flex items-center justify-center rounded-3xl"
      style={{ background: slide.illustrationBg, minHeight: 300 }}
    >
      <div className="grid grid-cols-3 gap-4 p-8">
        {icons.map((Icon, i) => (
          <div
            key={i}
            className="flex items-center justify-center w-20 h-20 bg-white/70 rounded-2xl shadow-sm hover:scale-110 transition-transform duration-200"
          >
            <Icon className="w-9 h-9 text-gray-600 opacity-80" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Standard slide ──────────────────────────────────── */
function StandardSlide({ slide }) {
  return (
    <div className="w-full" style={{ background: slide.bg }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid md:grid-cols-2 gap-6 items-center min-h-100 py-10">
          <div className="flex flex-col gap-4">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest px-3 py-1.5 rounded-full w-fit ${slide.badgeStyle}`}
            >
              <slide.badge.Icon className="w-3.5 h-3.5 shrink-0" />
              {slide.badge.text}
            </span>
            <div>
              <h1
                className={`text-4xl md:text-5xl font-extrabold leading-tight ${slide.headingColor}`}
              >
                {slide.headingLine1}
              </h1>
              <h2
                className={`text-4xl md:text-5xl font-extrabold leading-tight ${slide.headingColor}`}
              >
                {slide.headingLine2}
              </h2>
            </div>
            <p className="text-gray-500 text-[15px] max-w-md leading-relaxed">
              {slide.desc}
            </p>
            <TimerDHM
              endTime={slide.timerEnd}
              accentColor={slide.accentColor}
            />
            <div className="flex items-center gap-4 mt-1">
              <Link
                href={slide.primaryBtn.href}
                className="inline-flex items-center gap-2 justify-center px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
                style={{ background: slide.accentColor }}
              >
                {slide.primaryBtn.Icon && <slide.primaryBtn.Icon className="w-4 h-4 shrink-0" />}
                {slide.primaryBtn.label}
                <ArrowRightIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
              </Link>
              <Link
                href={slide.secondaryBtn.href}
                className="inline-flex items-center gap-1 px-2 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                {slide.secondaryBtn.label}
              </Link>
            </div>
          </div>
          <Illustration slide={slide} />
        </div>
      </div>
    </div>
  );
}

/* ── Festival slide ──────────────────────────────────── */
function FestivalSlide({ slide }) {
  return (
    <div className="w-full" style={{ background: slide.bg }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid md:grid-cols-2 gap-6 items-center min-h-105 py-10">
          <div className="flex flex-col gap-4">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest px-3 py-1.5 rounded-full w-fit ${slide.badgeStyle}`}
            >
              <slide.badge.Icon className="w-3.5 h-3.5 shrink-0" />
              {slide.badge.text}
            </span>
            <div className="leading-tight">
              <p className="text-4xl md:text-5xl font-extrabold text-gray-900">
                {slide.title}
              </p>
              <p
                className="text-4xl md:text-5xl font-extrabold"
                style={{ color: slide.accentColor }}
              >
                {slide.discountText}
              </p>
            </div>
            <p className="text-gray-600 text-[14px] max-w-sm leading-relaxed">
              {slide.desc}
            </p>
            <TimerHMS endTime={slide.timerEnd} />
            <div className="flex items-center gap-3 mt-1">
              <Link
                href={slide.primaryBtn.href}
                className="inline-flex items-center gap-2 justify-center px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
                style={{ background: slide.accentColor }}
              >
                <FireIcon className="w-4 h-4 shrink-0" />
                {slide.primaryBtn.label}
                <ArrowRightIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
              </Link>
              <Link
                href={slide.secondaryBtn.href}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold border-2 text-gray-700 hover:bg-white/60 transition-colors"
                style={{ borderColor: slide.accentColor }}
              >
                {slide.secondaryBtn.label}
              </Link>
            </div>
          </div>
          <Illustration slide={slide} />
        </div>
      </div>
    </div>
  );
}

/* ── Main carousel ───────────────────────────────────── */
export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const { activePromos } = usePromotions();

  // Prepend a dynamic festival slide for the highest-priority active promo
  const festivalSlide =
    activePromos.length > 0 ? buildFestivalSlide(activePromos[0]) : null;
  const visibleSlides = festivalSlide ? [festivalSlide, ...slides] : slides;

  const prev = useCallback(
    () => setCurrent((c) => (c === 0 ? visibleSlides.length - 1 : c - 1)),
    [visibleSlides.length],
  );
  const next = useCallback(
    () => setCurrent((c) => (c === visibleSlides.length - 1 ? 0 : c + 1)),
    [visibleSlides.length],
  );

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  const safeCurrent = visibleSlides.length ? Math.min(current, visibleSlides.length - 1) : 0;
  const slide = visibleSlides[safeCurrent] ?? visibleSlides[0];

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-6">
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slide.type === "festival" ? (
          <FestivalSlide slide={slide} />
        ) : (
          <StandardSlide slide={slide} />
        )}

        {/* Prev arrow */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2.5 shadow-md transition-all hover:scale-105 z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next arrow */}
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2.5 shadow-md transition-all hover:scale-105 z-10"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {visibleSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-7 h-2.5 bg-green-600"
                  : "w-2.5 h-2.5 bg-gray-400/60 hover:bg-gray-500"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const slides = [
  {
    id: 1,
    bg: "from-green-400 to-emerald-600",
    badge: "🥦 Fresh & Organic",
    title: "Farm Fresh",
    subtitle: "Vegetables",
    desc: "Locally sourced vegetables delivered straight from the farm to your door.",
    cta: "Shop Vegetables",
    href: "/category/vegetables",
    accent: "bg-green-700",
    pattern: "🥦🥕🌽🧅🥬🍅",
  },
  {
    id: 2,
    bg: "from-orange-400 to-amber-500",
    badge: "🍎 Seasonal Picks",
    title: "Juicy Fresh",
    subtitle: "Fruits",
    desc: "Hand-picked seasonal fruits bursting with flavour and nutrients.",
    cta: "Shop Fruits",
    href: "/category/fruits",
    accent: "bg-orange-700",
    pattern: "🍎🍌🍇🍊🍋🍓",
  },
  {
    id: 3,
    bg: "from-blue-400 to-indigo-600",
    badge: "🥛 Daily Essentials",
    title: "Pure & Fresh",
    subtitle: "Dairy & More",
    desc: "Quality dairy products, eggs, and everyday staples at the best prices.",
    cta: "Shop Dairy",
    href: "/category/dairy",
    accent: "bg-blue-800",
    pattern: "🥛🧀🥚🧈🍦🥜",
  },
  {
    id: 4,
    bg: "from-purple-500 to-pink-500",
    badge: "⚡ Best Deals",
    title: "Save More",
    subtitle: "Every Day",
    desc: "Free delivery above ₹199. Exclusive discounts on groceries you love.",
    cta: "View Offers",
    href: "/products",
    accent: "bg-purple-800",
    pattern: "🛒🎁💰🛍️🏷️✨",
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(
    () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1)),
    [],
  );
  const next = useCallback(
    () => setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1)),
    [],
  );

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [paused, next]);

  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <div
        className={`bg-gradient-to-br ${slide.bg} transition-all duration-700 ease-in-out`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center min-h-[380px] py-12">
            {/* Text */}
            <div className="space-y-5 text-white">
              <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
                {slide.badge}
              </span>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow">
                  {slide.title}
                </h1>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white/80 drop-shadow">
                  {slide.subtitle}
                </h2>
              </div>
              <p className="text-white/90 text-lg max-w-md leading-relaxed">
                {slide.desc}
              </p>
              <Link
                href={slide.href}
                className={`inline-block ${slide.accent} text-white px-8 py-3 rounded-lg font-semibold text-base hover:opacity-90 transition-opacity shadow-lg`}
              >
                {slide.cta} →
              </Link>
            </div>

            {/* Emoji illustration */}
            <div className="hidden md:flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 text-5xl select-none">
                {slide.pattern.split("").map((ch, i) =>
                  ch.trim() ? (
                    <span
                      key={i}
                      className="flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-2xl w-20 h-20 shadow-lg hover:scale-110 transition-transform duration-200"
                    >
                      {ch}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/60 text-white hover:text-gray-800 backdrop-blur-sm rounded-full p-2 transition-all shadow"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/60 text-white hover:text-gray-800 backdrop-blur-sm rounded-full p-2 transition-all shadow"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "bg-white w-6 h-2.5"
                : "bg-white/50 w-2.5 h-2.5 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

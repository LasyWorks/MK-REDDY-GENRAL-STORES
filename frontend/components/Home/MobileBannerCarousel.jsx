"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ImageWithFallback from "@/components/common/ImageWithFallback";
import { useCategories } from "@/context/CategoryContext";

const CURATED_IMAGE_MAP = [
  {
    keys: ["cooking", "atta", "rice", "cereal", "essentials", "oil", "spice"],
    image:
      "https://images.unsplash.com/photo-1514995669114-6081e934b693?auto=format&fit=crop&w=1200&q=80",
  },
  {
    keys: ["personal", "hygiene", "beauty", "soap", "shampoo", "body wash"],
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80",
  },
  {
    keys: ["household", "cleaning", "detergent"],
    image:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80",
  },
  {
    keys: ["snacks", "packaged", "biscuits", "cookies", "chips"],
    image:
      "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=1200&q=80",
  },
  {
    keys: ["beverage", "tea", "coffee", "drink"],
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    keys: ["baby", "kids", "kid", "infant", "formula", "diaper"],
    image:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    keys: ["fruits", "vegetables", "fresh"],
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80",
  },
];

const STYLE_MAP = [
  {
    keys: ["fruits", "vegetables", "fresh"],
    bg: "linear-gradient(130deg, #f2fdf5 0%, #ddf4e2 55%, #c4efce 100%)",
    accent: "#229A4B",
    tag: "FARM FRESH",
  },
  {
    keys: ["snacks", "packaged", "cookies", "chips"],
    bg: "linear-gradient(130deg, #fff9f0 0%, #ffe6c7 55%, #ffd9ad 100%)",
    accent: "#ea6f14",
    tag: "TOP PICKS",
  },
  {
    keys: ["beverage", "tea", "coffee", "drink"],
    bg: "linear-gradient(130deg, #f0f8ff 0%, #d9ecff 55%, #c6e2ff 100%)",
    accent: "#1f70d1",
    tag: "DAILY SIP",
  },
  {
    keys: ["household", "cleaning", "detergent"],
    bg: "linear-gradient(130deg, #f5f6ff 0%, #e9eaff 55%, #dfe0ff 100%)",
    accent: "#5b57d9",
    tag: "HOME CARE",
  },
  {
    keys: ["personal", "hygiene", "beauty", "soap", "shampoo", "body wash"],
    bg: "linear-gradient(130deg, #fff4fa 0%, #ffe2f0 55%, #ffd6ea 100%)",
    accent: "#d83f90",
    tag: "SELF CARE",
  },
  {
    keys: ["cooking", "essentials", "rice", "atta", "oil", "spice"],
    bg: "linear-gradient(130deg, #fef8f1 0%, #ffe9d6 55%, #ffdcc2 100%)",
    accent: "#d36a1f",
    tag: "KITCHEN HUB",
  },
  {
    keys: ["baby", "kids", "kid", "infant", "formula", "diaper"],
    bg: "linear-gradient(130deg, #f6fbff 0%, #e5f3ff 55%, #d8edff 100%)",
    accent: "#2f90d7",
    tag: "BABY CARE",
  },
];

const FALLBACK_SLIDES = [
  {
    id: "fallback-1",
    name: "Shop by Category",
    productCount: 0,
    href: "/categories",
    tag: "MK STORES",
    accent: "#229A4B",
    bg: "linear-gradient(130deg, #f2fdf5 0%, #ddf4e2 55%, #c4efce 100%)",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    subline: "Fresh groceries delivered fast",
  },
];

const AUTO_PLAY_MS = 6500;
const toSlug = (name = "") =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function matchByKeys(name = "", config = []) {
  const lower = name.toLowerCase();
  let bestMatch = null;
  let bestScore = -1;

  for (const entry of config) {
    for (const key of entry.keys) {
      if (!lower.includes(key)) continue;

      // Prefer more specific keyword matches over generic ones.
      const score = key.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  return bestMatch;
}

export default function MobileBannerCarousel() {
  const { categories, loading } = useCategories();
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [shareMessage, setShareMessage] = useState("");
  const timerRef = useRef(null);
  const pointerActiveRef = useRef(false);
  const SHARE_URL = "https://mkreddygeneralstore.com/";

  const parentCategories = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0))
    .slice(0, 7)
    .map((c) => {
      const name = c.name_en || c.name;
      const style =
        matchByKeys(name, STYLE_MAP) ||
        { bg: "linear-gradient(130deg, #f4f7f8 0%, #e4ebef 55%, #d7e0e6 100%)", accent: "#2f6b82", tag: "FEATURED" };
      const curated = matchByKeys(name, CURATED_IMAGE_MAP);
      return {
        id: c.id,
        name,
        productCount: Number(c.product_count || 0),
        href: `/category/${toSlug(name)}`,
        tag: style.tag,
        accent: style.accent,
        bg: style.bg,
        image: curated?.image || c.image_url || "",
        subline: `Explore ${name} at great prices`,
      };
    });

  const slides = parentCategories.length ? parentCategories : FALLBACK_SLIDES;
  const featureChips = (parentCategories.length ? parentCategories : FALLBACK_SLIDES)
    .slice(0, 4)
    .map((c) => c.name);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + slides.length) % slides.length),
    [slides.length],
  );

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_PLAY_MS);
  }, [next]);

  useEffect(() => {
    timerRef.current = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [next]);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  // Swipe handlers
  const onTouchStart = (e) => {
    if (!e.touches?.length) return;
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
    if (!isDragging) return;
    setIsDragging(false);
    if (dragDelta < -50) {
      next();
    } else if (dragDelta > 50) {
      prev();
    }
    setDragDelta(0);
    resetTimer();
  };

  const onTouchCancel = () => {
    setIsDragging(false);
    setDragDelta(0);
    resetTimer();
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    pointerActiveRef.current = true;
    setIsDragging(true);
    setStartX(e.clientX);
    setDragDelta(0);
    clearInterval(timerRef.current);
  };

  const onPointerMove = (e) => {
    if (!pointerActiveRef.current) return;
    setDragDelta(e.clientX - startX);
  };

  const onPointerUp = () => {
    if (!pointerActiveRef.current) return;
    pointerActiveRef.current = false;
    onTouchEnd();
  };

  const onPointerCancel = () => {
    pointerActiveRef.current = false;
    onTouchCancel();
  };

  const goTo = (idx) => {
    setCurrent(idx);
    resetTimer();
  };

  const onShareSite = async () => {
    const shareData = {
      title: "MK Reddy General Store",
      text: "Shop groceries online from MK Reddy General Store",
      url: SHARE_URL,
    };

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SHARE_URL);
        setShareMessage("Site link copied");
        setTimeout(() => setShareMessage(""), 2200);
      }
    } catch {
      setShareMessage("Could not share right now");
      setTimeout(() => setShareMessage(""), 2200);
    }
  };

  const banner = slides[current] || FALLBACK_SLIDES[0];

  if (loading && !categories.length) {
    return (
      <section className="px-3 md:px-10 lg:px-14 xl:px-20 pt-2 md:pt-5 pb-3 md:pb-6">
        <div className="mx-auto max-w-[1500px] h-[205px] md:h-[330px] lg:h-[360px] rounded-2xl md:rounded-[30px] bg-gray-100 animate-pulse" />
      </section>
    );
  }

  return (
    <section className="px-3 md:px-10 lg:px-14 xl:px-20 pt-2 md:pt-5 pb-3 md:pb-6">
      <div className="mx-auto max-w-[1500px] mb-2 md:mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] md:text-sm font-semibold text-gray-600">
          Share the site
        </span>
        <button
          type="button"
          onClick={onShareSite}
          className="inline-flex items-center rounded-full bg-[#16a34a] text-white text-[11px] md:text-sm font-semibold px-3 md:px-4 py-1.5 md:py-2 hover:bg-[#14853f] transition-colors"
        >
          Share
        </button>
      </div>

      {shareMessage ? (
        <p className="mx-auto max-w-[1500px] mb-2 text-[11px] md:text-xs text-[#15803d] font-medium px-1">
          {shareMessage}
        </p>
      ) : null}

      <div
        className="mx-auto max-w-[1500px] relative overflow-hidden rounded-2xl md:rounded-[30px] select-none h-[205px] md:h-[330px] lg:h-[360px]"
        style={{
          background: banner.bg,
          transition: "background 0.75s ease-in-out",
          touchAction: "pan-y",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="hidden md:block absolute inset-0 bg-[linear-gradient(108deg,#f8fbf3_0%,#f2f8ea_45%,#eef9f3_100%)]" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 82% 18%, rgba(255,255,255,0.72), rgba(255,255,255,0) 48%)" }} />

        {/* Mobile Content */}
        <div
          key={banner.id}
          className="carousel-slide md:hidden absolute inset-0 grid grid-cols-[1fr_42%] items-stretch p-3 gap-2"
        >
          {/* Left text content */}
          <div className="min-w-0 h-full flex flex-col justify-between py-1">
            <div>
              {/* Tag badge */}
              <span
                className="inline-block text-white text-[10px] md:text-[11px] font-extrabold tracking-[0.12em] px-2.5 md:px-3 py-0.5 md:py-1 rounded-full mb-2 md:mb-3"
                style={{ backgroundColor: banner.accent }}
              >
                {banner.tag}
              </span>

              {/* Headlines */}
              <h2 className="text-[18px] font-black text-[#0f172a] leading-[1.06] tracking-tight max-w-[95%] line-clamp-2 pb-[2px]">
                {banner.name}
              </h2>
              <p
                className="text-[12px] font-extrabold mb-1 line-clamp-1"
                style={{ color: banner.accent }}
              >
                {banner.productCount > 0 ? `${banner.productCount} products available` : "Fresh picks for your home"}
              </p>
              <p className="text-[10px] text-[#374151] leading-snug mb-2 line-clamp-2 max-w-[95%]">
                {banner.subline}
              </p>
            </div>

            <Link
              href={banner.href}
              className="inline-flex w-fit items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-95 transition-transform duration-150"
              style={{ backgroundColor: banner.accent }}
            >
              Shop Now
            </Link>
          </div>

          {/* Right image */}
          <div className="h-full flex items-start justify-end pr-0 md:pr-1 pt-2">
            <ImageWithFallback
              src={banner.image}
              alt={banner.name}
              className="w-full h-[120px] object-cover object-top rounded-xl"
              size="lg"
              priority
            />
          </div>
        </div>

        {/* Tablet + Laptop Content */}
        <div className="hidden md:grid carousel-slide absolute inset-0 grid-cols-[1.02fr_0.98fr] items-center px-12 lg:px-16 py-8 lg:py-10 gap-8">
          <div className="min-w-0 h-full flex flex-col justify-center">
            <span className="inline-block w-fit text-[#0f172a] text-xs font-semibold bg-white/80 border border-[#e5edd7] px-3 py-1 rounded-full mb-4">
              GroVest Style, MK Colors
            </span>

            <h2 className="text-[44px] lg:text-[54px] font-black leading-[1.04] tracking-tight text-[#0f172a] max-w-[720px] pb-[3px]">
              Best deal for your groceries
            </h2>

            <p className="mt-3 text-[17px] lg:text-[18px] leading-snug text-[#3b4a5a] max-w-[560px]">
              Now featuring {banner.name}. Shop handpicked essentials with genuine brands and faster doorstep delivery.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <Link
                href={banner.href}
                className="inline-flex items-center text-white text-sm font-semibold px-7 py-3 rounded-full bg-[#16a34a] hover:bg-[#14853f] transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center text-[#1f2937] text-sm font-semibold px-7 py-3 rounded-full bg-white border border-[#dbe6cc] hover:bg-[#f8fbef] transition-colors"
              >
                Learn More
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {featureChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-[#dbe6cc] text-xs font-medium text-[#4b5a37] bg-white/85"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="relative h-full flex items-start justify-center pt-3 lg:pt-4">
            <div className="absolute w-[360px] h-[360px] lg:w-[420px] lg:h-[420px] rounded-full bg-[#d9f067]/45 blur-[2px]" />
            <div className="absolute w-[300px] h-[300px] lg:w-[360px] lg:h-[360px] rounded-full bg-[#8bd2f2]/28 -left-4 top-8" />
            <ImageWithFallback
              src={banner.image}
              alt={banner.name}
              className="relative z-10 w-full max-w-[500px] lg:max-w-[580px] h-[300px] lg:h-[340px] object-contain object-top rounded-[26px] shadow-[0_18px_50px_rgba(22,163,74,0.18)]"
              size="lg"
              priority
            />
          </div>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-2.5 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-4 md:w-7 h-1.5 md:h-2 bg-[#16a34a]"
                  : "w-1.5 md:w-2 h-1.5 md:h-2 bg-[#94a3b8]/75"
              }`}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>

      </div>

      <style jsx>{`
        .carousel-slide {
          animation: slideFadeIn 0.62s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes slideFadeIn {
          from {
            opacity: 0;
            transform: translate3d(16px, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </section>
  );
}

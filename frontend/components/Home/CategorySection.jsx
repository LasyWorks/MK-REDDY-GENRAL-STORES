"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ImageWithFallback from "../common/ImageWithFallback";
import { useLanguage } from "@/context/LanguageContext";
import { useCategories } from "@/context/CategoryContext";

const toSlug = (name) =>
  name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") ?? "";

// Map category name keywords → emoji + background colour
const CATEGORY_STYLE_MAP = [
  {
    keywords: ["fruit", "vegetable", "veg", "fresh"],
    emoji: "🥦",
    bg: "#dcfce7",
    fg: "#16a34a",
  },
  {
    keywords: ["snack", "chocolate", "biscuit", "chips", "packed", "packaged"],
    emoji: "🍿",
    bg: "#fef9c3",
    fg: "#ca8a04",
  },
  {
    keywords: ["personal care", "hygiene", "beauty", "care"],
    emoji: "🧴",
    bg: "#ede9fe",
    fg: "#7c3aed",
  },
  {
    keywords: ["household", "cleaning", "cleaner", "detergent", "home"],
    emoji: "🧹",
    bg: "#dbeafe",
    fg: "#2563eb",
  },
  {
    keywords: ["beverage", "drink", "juice", "water", "soft drink"],
    emoji: "🥤",
    bg: "#ffedd5",
    fg: "#ea580c",
  },
  {
    keywords: ["baby", "kid", "infant", "child"],
    emoji: "🍼",
    bg: "#fce7f3",
    fg: "#db2777",
  },
  {
    keywords: ["dairy", "milk", "paneer", "curd", "cheese", "egg"],
    emoji: "🥛",
    bg: "#eff6ff",
    fg: "#3b82f6",
  },
  {
    keywords: [
      "cooking",
      "oil",
      "spice",
      "masala",
      "flour",
      "grain",
      "pulse",
      "rice",
      "atta",
      "dal",
    ],
    emoji: "🌶️",
    bg: "#fff7ed",
    fg: "#f97316",
  },
  {
    keywords: ["meat", "chicken", "fish", "seafood", "mutton"],
    emoji: "🍗",
    bg: "#fef2f2",
    fg: "#dc2626",
  },
  {
    keywords: ["organic", "natural", "herbal"],
    emoji: "🌿",
    bg: "#f0fdf4",
    fg: "#16a34a",
  },
  {
    keywords: ["frozen", "ice cream", "frozen food"],
    emoji: "🧊",
    bg: "#e0f2fe",
    fg: "#0284c7",
  },
  {
    keywords: ["bakery", "bread", "cake", "bake"],
    emoji: "🍞",
    bg: "#fef3c7",
    fg: "#d97706",
  },
  {
    keywords: ["stationery", "office", "school"],
    emoji: "✏️",
    bg: "#f3e8ff",
    fg: "#9333ea",
  },
  {
    keywords: ["pet", "dog", "cat", "animal"],
    emoji: "🐾",
    bg: "#fdf4ff",
    fg: "#a21caf",
  },
];

function getCategoryStyle(name = "") {
  const lower = name.toLowerCase();
  for (const entry of CATEGORY_STYLE_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return { emoji: entry.emoji, bg: entry.bg, fg: entry.fg };
    }
  }
  // Default fallback
  return { emoji: "🛒", bg: "#f3f4f6", fg: "#6b7280" };
}
export default function CategorySection() {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const { categories: allCats, loading, error: catError } = useCategories();
  const error = catError || null;
  const categories = allCats.filter((c) => !c.parent_id && parseInt(c.product_count || 0) > 0);
  return (
    <>
      {/* ═══════════════════════════════════════════
          MOBILE: Quick-shop category grid
      ═══════════════════════════════════════════ */}
      <section className="md:hidden bg-white pt-3 pb-4">
        <div className="px-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Shop by Category</h2>
            <Link
              href="/categories"
              className="text-xs text-green-600 font-semibold hover:underline"
            >
              View all
            </Link>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse" />
                  <div className="h-2.5 w-12 bg-gray-100 animate-pulse rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Category grid */}
          {!loading && categories.length > 0 && (
            <div className="grid grid-cols-4 gap-x-2 gap-y-3">
              {categories.slice(0, 8).map((category) => {
                const { emoji, bg, fg } = getCategoryStyle(
                  category.name_en || category.name,
                );
                return (
                  <Link
                    key={category.id}
                    href={`/category/${toSlug(category.name_en || category.name)}`}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform duration-150"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-100"
                      style={{ backgroundColor: category.image_url ? "#ffffff" : bg }}
                    >
                      {category.image_url ? (
                        <ImageWithFallback
                          src={category.image_url}
                          alt={category.name}
                          className="w-10 h-10 object-contain rounded-xl"
                          size="sm"
                          priority
                        />
                      ) : (
                        emoji
                      )}
                    </div>
                    <span
                      className="text-[10px] font-semibold text-center leading-tight line-clamp-2 max-w-[58px]"
                      style={{ color: fg }}
                    >
                      {category.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* More categories pill */}
          {!loading && categories.length > 8 && (
            <Link
              href="/categories"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-semibold text-gray-600 active:bg-gray-100 transition-colors"
            >
              All {categories.length} Categories
              <span className="text-gray-400">›</span>
            </Link>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          DESKTOP: Original circle layout (unchanged)
      ═══════════════════════════════════════════ */}
      <section className="hidden md:block py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Shop by Category
            </h2>
            <span className="text-sm text-gray-500">
              {categories.length} categories
            </span>
          </div>
          {}
          {loading && (
            <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
              {[...Array(11)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center flex-shrink-0"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 animate-pulse mb-3" />
                  <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                </div>
              ))}
            </div>
          )}
          {}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchCategories}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          {}
          {!loading && !error && categories.length > 0 && (
            <div className="relative">
              <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${toSlug(category.name_en || category.name)}`}
                    className="flex flex-col items-center flex-shrink-0 group cursor-pointer snap-start"
                  >
                    {}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-gray-100 bg-white group-hover:border-blue-500 transition-all duration-300 shadow-md group-hover:shadow-xl mb-3">
                      <ImageWithFallback
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-contain p-2"
                        size="lg"
                        priority
                      />
                    </div>
                    {}
                    <span className="text-xs sm:text-sm font-medium text-gray-900 text-center group-hover:text-blue-600 transition-colors line-clamp-2 max-w-[110px] px-1">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {}
          {!loading && !error && categories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No categories available</p>
              <p className="text-sm text-gray-400 mt-2">
                Categories will appear here once added
              </p>
            </div>
          )}
        </div>
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </section>
    </>
  );
}

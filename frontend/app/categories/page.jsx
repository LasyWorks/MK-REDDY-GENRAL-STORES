"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/context/LanguageContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

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
  return { emoji: "🛒", bg: "#f3f4f6", fg: "#6b7280" };
}

export default function CategoriesPage() {
  const { lang } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/categories?limit=200&is_active=true&lang=${lang}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      const all = json.data || [];
      setCategories(
        all.filter((c) => !c.parent_id && parseInt(c.product_count || 0) > 0),
      );
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filtered = categories.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-[#F7F7F7] pb-6">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900 mb-3">All Categories</h1>

        {/* Search */}
        <div className="relative flex items-center bg-[#F7F7F7] rounded-full border border-gray-200 focus-within:border-[#16A34A] transition-colors">
          <MagnifyingGlassIcon className="absolute left-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full bg-transparent pl-9 pr-8 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none rounded-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 text-gray-400"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 px-4 pt-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-2xl bg-gray-200 animate-pulse" />
              <div className="w-16 h-3 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-5 px-4 pt-4">
          {filtered.map((category) => {
            const { emoji, bg, fg } = getCategoryStyle(
              category.name_en || category.name,
            );
            return (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="flex flex-col items-center gap-2 active:scale-90 transition-transform duration-150"
              >
                {/* Emoji tile */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-sm"
                  style={{ backgroundColor: bg }}
                >
                  {emoji}
                </div>
                {/* Label */}
                <span
                  className="text-[11px] font-semibold text-center leading-tight text-gray-700 line-clamp-2 max-w-[76px]"
                  style={{ color: fg }}
                >
                  {category.name}
                </span>
                {/* Product count */}
                {category.product_count && (
                  <span className="text-[10px] text-gray-400 -mt-1">
                    {category.product_count} items
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <span className="text-5xl mb-3">🔍</span>
          <p className="text-gray-700 font-semibold text-base mb-1">
            No categories found
          </p>
          <p className="text-gray-400 text-sm">Try a different search term</p>
        </div>
      )}
    </main>
  );
}

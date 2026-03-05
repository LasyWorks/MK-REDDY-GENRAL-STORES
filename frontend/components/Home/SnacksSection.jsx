"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  CakeIcon as Cookie,
} from "@heroicons/react/24/outline";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";
import categoryService from "@/services/categoryService";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

/* Snack-related keywords to filter out non-snack products from mixed results */
const SNACK_KEYWORDS = [
  "chocolate",
  "biscuit",
  "cookie",
  "chips",
  "namkeen",
  "wafer",
  "candy",
  "toffee",
  "snack",
  "cracker",
  "kurkure",
  "lays",
  "parle",
  "hide seek",
  "bourbon",
  "oreo",
  "kitkat",
  "dairy milk",
  "5 star",
  "munch",
  "cadbury",
  "maggi",
  "noodle",
  "peanut",
  "popcorn",
  "murukku",
];

function isSnack(product) {
  const text = `${product.name} ${product.category_name || ""}`.toLowerCase();
  return SNACK_KEYWORDS.some((kw) => text.includes(kw));
}

export default function SnacksSection() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Step 1: find the Snacks & Chocolates parent category by English name (stable across languages)
        const catRes = await categoryService.getAll({ limit: 200 });
        const allCats = catRes.data || [];
        const snackCat = allCats.find((c) =>
          /snack|chocolate/i.test(c.name_en || c.name || ""),
        );

        let fetched = [];

        if (snackCat) {
          // Step 2a: fetch by parent_category_id (covers all sub-categories too)
          const res = await fetch(
            `${API_URL}/products?parent_category_id=${snackCat.id}&is_active=true&limit=40&lang=${lang}`,
          );
          const json = await res.json();
          fetched = json.data || [];

          // Also fetch direct children categories' products
          if (!fetched.length) {
            const res2 = await fetch(
              `${API_URL}/products?category_id=${snackCat.id}&is_active=true&limit=40&lang=${lang}`,
            );
            const json2 = await res2.json();
            fetched = json2.data || [];
          }
        }

        // Step 2b: fallback — keyword search, then filter to real snacks
        if (!fetched.length) {
          const res = await fetch(
            `${API_URL}/products?search=chocolate+biscuit+chips+namkeen+cookie&is_active=true&limit=60&lang=${lang}`,
          );
          const json = await res.json();
          fetched = (json.data || []).filter(isSnack);
        }

        setProducts(fetched);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [lang]);

  const productGroups = useMemo(
    () => groupProductsByVariant(products),
    [products],
  );

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  if (!loading && productGroups.length === 0) return null;

  return (
    <section className="py-4 md:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div>
              <h2 className="text-base md:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                Snacks &amp; Chocolates
              </h2>
              <p className="text-[11px] md:text-sm text-gray-500 mt-0 md:mt-0.5">
                Your favourite treats, always in stock
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/category/snacks-chocolates"
              className="text-xs md:text-sm font-semibold text-[#16A34A] hover:underline"
            >
              View All →
            </Link>
            {!loading && productGroups.length > 0 && (
              <div className="hidden sm:flex gap-2">
                <button
                  onClick={() => scroll("left")}
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-44 rounded-xl bg-gray-100 animate-pulse"
                style={{ height: 280 }}
              />
            ))}
          </div>
        )}

        {/* Carousel */}
        {!loading && productGroups.length > 0 && (
          <div
            ref={scrollRef}
            className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          >
            {productGroups.map((group, idx) => (
              <div
                key={`${group.name}-${idx}`}
                className="flex-shrink-0 w-36 sm:w-44 md:w-52 snap-start"
              >
                {group.variants.length > 1 ? (
                  <ProductCardWithVariants variants={group.variants} />
                ) : (
                  <ProductCard product={group.variants[0]} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

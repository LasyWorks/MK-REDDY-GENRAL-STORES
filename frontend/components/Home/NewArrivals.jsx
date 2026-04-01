"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

// How many days counts as "new"
const NEW_DAYS = 30;

export default function NewArrivals() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchNewArrivals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/products?is_active=true&in_stock=true&sort_by=created_at&sort_order=DESC&limit=40&lang=${lang}`,
      );
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      const all = json.data || [];
      // Prefer truly new products; fall back to most recent if none
      const cutoff = Date.now() - NEW_DAYS * 24 * 3600 * 1000;
      const fresh = all.filter(
        (p) => p.created_at && new Date(p.created_at).getTime() >= cutoff,
      );
      setProducts(fresh.length >= 4 ? fresh : all.slice(0, 20));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchNewArrivals();
  }, [fetchNewArrivals]);

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
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-[#7C3AED] shrink-0" />
            <div>
              <h2 className="text-base md:text-3xl font-bold text-gray-900 leading-tight">
                New Arrivals
              </h2>
              <p className="text-[11px] md:text-sm text-gray-500 mt-0 md:mt-0.5">
                Fresh additions to our store
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/products?sort_by=created_at&sort_order=DESC"
              className="text-[#16A34A] text-xs md:text-sm font-semibold hover:underline"
            >
              View All
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

        {/* Cards */}
        {!loading && productGroups.length > 0 && (
          <>
            {/* "✦ New" ribbon strip above the cards */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full">
                <SparklesIcon className="w-3 h-3" />
                Showing latest {productGroups.length} products
              </span>
            </div>
            <div
              ref={scrollRef}
              className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            >
              {productGroups.map((group, idx) => (
                <div
                  key={`${group.name}-${idx}`}
                  className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] snap-start"
                >
                  {group.variants.length > 1 ? (
                    <ProductCardWithVariants variants={group.variants} />
                  ) : (
                    <ProductCard product={group.variants[0]} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

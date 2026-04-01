"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ArrowPathIcon as RefreshIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

// Products updated within this many days count as "recently updated"
const UPDATED_DAYS = 7;

export default function RecentlyUpdated() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchUpdated = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/products?is_active=true&sort_by=updated_at&sort_order=DESC&limit=30&lang=${lang}`,
      );
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      const all = json.data || [];
      // Prefer products updated within the window; fall back to top 20 most recently updated
      const cutoff = Date.now() - UPDATED_DAYS * 24 * 3600 * 1000;
      const fresh = all.filter(
        (p) => p.updated_at && new Date(p.updated_at).getTime() >= cutoff,
      );
      setProducts(fresh.length >= 4 ? fresh : all.slice(0, 20));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchUpdated();
  }, [fetchUpdated]);

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
            <RefreshIcon className="w-5 h-5 text-[#0EA5E9] shrink-0" />
            <div>
              <h2 className="text-base md:text-3xl font-bold text-gray-900 leading-tight">
                Recently Updated
              </h2>
              <p className="text-[11px] md:text-sm text-gray-500 mt-0 md:mt-0.5">
                Latest price changes &amp; restocks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/products?sort_by=updated_at&sort_order=DESC"
              className="text-[#16A34A] text-xs md:text-sm font-semibold hover:underline"
            >
              View All
            </Link>
            <div className="hidden md:flex gap-2">
              {!loading && productGroups.length > 0 && (
                <>
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
                </>
              )}
            </div>
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

        {/* Products */}
        {!loading && productGroups.length > 0 && (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
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
        )}
      </div>
    </section>
  );
}

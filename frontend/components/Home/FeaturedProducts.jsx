"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  StarIcon as Star,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
export default function FeaturedProducts() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const fetchFeatured = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/products/daily-featured?limit=20&lang=${lang}`,
      );
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setProducts(json.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);
  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);
  const productGroups = useMemo(() => {
    return groupProductsByVariant(products);
  }, [products]);
  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };
  if (!loading && productGroups.length === 0) return null;
  return (
    <section className="py-4 md:py-10">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div>
              <h2 className="text-base md:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                Featured Products
              </h2>
              <p className="text-[11px] md:text-sm text-gray-500 mt-0 md:mt-0.5">
                Handpicked bestsellers just for you
              </p>
            </div>
          </div>
          {}
          <div className="flex items-center gap-2">
            <Link
              href="/products"
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
        {}
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
        {}
        {!loading && productGroups.length > 0 && (
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
        )}
      </div>
    </section>
  );
}

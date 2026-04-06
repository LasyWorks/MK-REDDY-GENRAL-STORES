"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  FireIcon as Flame,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
export default function HotDeals() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/products?has_discount=true&is_active=true&in_stock=true&sort_by=discount&sort_order=DESC&limit=20&lang=${lang}`,
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
    fetchDeals();
  }, [fetchDeals]);
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
    <section className="py-0 md:py-0">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF6B00] shrink-0" />
            <div>
              <h2 className="text-base md:text-xl font-semibold text-gray-800 leading-snug">
                Hot Deals
              </h2>
              <p className="text-sm md:text-base text-gray-500 leading-relaxed mt-0.5 md:mt-1 max-w-[24ch]">
                Limited time offers
              </p>
            </div>
          </div>
          {}
          <div className="flex items-center gap-2">
            <Link
              href="/hot-deals"
              className="text-[#16A34A] text-xs md:text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/60 rounded-md px-1 py-0.5"
            >
              View All
            </Link>
            <div className="hidden md:flex gap-2">
              {!loading && productGroups.length > 0 && (
                <>
                  <button
                    onClick={() => scroll("left")}
                    className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/60"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => scroll("right")}
                    className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/60"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}
            </div>
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

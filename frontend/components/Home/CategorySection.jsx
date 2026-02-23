"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ImageWithFallback from "../common/ImageWithFallback";
import { useLanguage } from "@/context/LanguageContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

export default function CategorySection() {
  const { lang } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/categories?limit=100&is_active=true&lang=${lang}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const all = json.data || [];
      setCategories(all.filter((c) => !c.parent_id));
      setError(null);
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  // Re-fetch whenever language changes
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Shop by Category
          </h2>
          <span className="text-sm text-gray-500">
            {categories.length} categories
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="flex flex-col items-center flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 animate-pulse mb-3" />
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
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

        {/* Categories Horizontal Scroll */}
        {!loading && !error && categories.length > 0 && (
          <div className="relative">
            <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.id}`}
                  className="flex flex-col items-center flex-shrink-0 group cursor-pointer snap-start"
                >
                  {/* Category Image - Circular */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-gray-100 group-hover:border-blue-500 transition-all duration-300 shadow-md group-hover:shadow-xl mb-3">
                    <ImageWithFallback
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                      size="lg"
                    />
                  </div>

                  {/* Category Name */}
                  <span className="text-xs sm:text-sm font-medium text-gray-900 text-center group-hover:text-blue-600 transition-colors line-clamp-2 max-w-[110px] px-1">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
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
  );
}

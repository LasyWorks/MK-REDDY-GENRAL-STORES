"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import categoryService from "../../services/categoryService";
export default function CategoryNav() {
  const scrollContainerRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll({ limit: 50 });
      setCategories(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };
  return (
    <div className="bg-white border-b border-gray-100 sticky top-20 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative flex items-center h-14">
          { }
          {!loading && categories.length > 0 && (
            <button
              onClick={() => scroll("left")}
              className="hidden md:flex absolute left-0 z-10 h-14 w-10 items-center justify-center bg-white hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
          )}
          { }
          <div
            ref={scrollContainerRef}
            className="flex gap-8 overflow-x-auto scrollbar-hide py-4 scroll-smooth md:pl-12 md:pr-12"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {loading ? (
              <div className="flex gap-8">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-5 w-28 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : categories.length === 0 ? (
              <div className="text-gray-500 text-sm">
                No categories available
              </div>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  className="text-gray-800 hover:text-blue-600 text-[15px] whitespace-nowrap transition-colors"
                  onClick={() => {
                    window.location.href = `/categories/${category.id}`;
                  }}
                >
                  {category.name}
                </button>
              ))
            )}
          </div>
          { }
          {!loading && categories.length > 0 && (
            <button
              onClick={() => scroll("right")}
              className="hidden md:flex absolute right-0 z-10 h-14 w-10 items-center justify-center bg-white hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
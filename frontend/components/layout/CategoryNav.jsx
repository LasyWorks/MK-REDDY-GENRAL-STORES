"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const categories = [
  "Fresh Vegetables",
  "Fresh Fruits",
  "Atta, Rice & Grains",
  "Dals & Pulses",
  "Oil & Ghee",
  "Milk & Dairy",
  "Snacks & Biscuits",
  "Cold Drinks",
  "Chocolates",
  "Ready to Eat",
  "Personal Care",
  "Home & Kitchen",
];

export default function CategoryNav() {
  const scrollContainerRef = useRef(null);

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
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-0 z-10 h-14 w-10 items-center justify-center bg-white hover:bg-gray-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>

          {/* Categories */}
          <div
            ref={scrollContainerRef}
            className="flex gap-8 overflow-x-auto scrollbar-hide py-4 scroll-smooth md:pl-12 md:pr-12"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category) => (
              <button
                key={category}
                className="text-gray-800 hover:text-blue-600 text-[15px] whitespace-nowrap transition-colors"
              >
                {category}
              </button>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-0 z-10 h-14 w-10 items-center justify-center bg-white hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </div>
    </div>
  );
}

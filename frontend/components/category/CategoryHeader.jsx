"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  AdjustmentsHorizontalIcon as SlidersHorizontal,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";
import CustomSelect from "@/components/ui/custom-select";

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "rating", label: "Customer Rating" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount", label: "Discount" },
  { value: "newest", label: "New Arrivals" },
];

const FILTER_LABELS = {
  min_price: (v) => `Min ₹${v}`,
  max_price: (v) => `Max ₹${v}`,
  brand: (v) => `Brand: ${v}`,
  in_stock: () => "In Stock",
  has_discount: () => "Discounted",
};

export default function CategoryHeader({
  category,
  totalCount,
  onMobileFilterClick,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "popularity";

  /* Build active filter chips */
  const activeFilters = [];
  for (const [key, labelFn] of Object.entries(FILTER_LABELS)) {
    const val = searchParams.get(key);
    if (val && val !== "false")
      activeFilters.push({ key, label: labelFn(val) });
  }

  const handleSortChange = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => router.push(pathname);

  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-gray-200">
      {/* Row 1 - title + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
            {category?.name || "Category"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount.toLocaleString()} {" "}
            {totalCount === 1 ? "product" : "products"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Filter Button */}
          <button
            onClick={onMobileFilterClick}
            className="lg:hidden flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilters.length > 0 && (
              <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="relative">
            <CustomSelect
              value={currentSort}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
              buttonClassName="bg-white border border-gray-300 text-gray-700 h-10 pl-4 pr-9 rounded-xl text-sm font-medium shadow-sm"
              contentClassName="min-w-[220px]"
            />
          </div>
        </div>
      </div>

      {/* Row 2 - active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            Active filters:
          </span>
          {activeFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => removeFilter(key)}
              className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              {label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

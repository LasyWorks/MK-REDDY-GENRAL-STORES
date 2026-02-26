"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CategoryHeader from "./CategoryHeader";
import Sidebar from "./Sidebar";
import ProductGrid from "./ProductGrid";

/* ── Pagination ── */
function Pagination({ currentPage, totalPages }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page);
    router.push(`${pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build page numbers to show: always first, last, and ±1 around current
  const pages = new Set(
    [1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(
      (p) => p >= 1 && p <= totalPages,
    ),
  );
  const sorted = [...pages].sort((a, b) => a - b);

  // Insert ellipsis markers
  const items = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) items.push("...");
    items.push(p);
    prev = p;
  }

  return (
    <nav
      className="flex items-center justify-center gap-1.5 pt-10 pb-4"
      aria-label="Pagination"
    >
      <button
        onClick={() => go(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl
          hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Prev
      </button>

      {items.map((item, i) =>
        item === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-gray-400 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => go(item)}
            className={`min-w-[38px] px-3 py-2 text-sm font-semibold rounded-xl border transition-colors ${
              item === currentPage
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => go(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl
          hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

/* ── Main Layout ── */
export default function CategoryLayout({
  category,
  subcategories,
  activeSubcategory,
  products,
  totalCount,
  brands,
  currentPage = 1,
  pageSize = 20,
}) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CategoryHeader
        category={activeSubcategory || category}
        totalCount={totalCount}
        onMobileFilterClick={() => setIsMobileFilterOpen(true)}
      />

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <Sidebar
          mainCategory={category}
          subcategories={subcategories}
          activeSubcategory={activeSubcategory}
          brands={brands}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />

        <div className="flex-1 min-w-0">
          <ProductGrid products={products} />
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}

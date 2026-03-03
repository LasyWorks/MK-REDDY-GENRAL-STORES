"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

/**
 * Reusable pagination component.
 *
 * Props:
 *   currentPage  – 1-based current page number
 *   totalPages   – total number of pages
 *   onPageChange – callback(page: number) called when user clicks a page
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const go = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Always show: first, last, current, current±1
  const pageSet = new Set(
    [1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(
      (p) => p >= 1 && p <= totalPages,
    ),
  );
  const sorted = [...pageSet].sort((a, b) => a - b);

  // Insert ellipsis markers between gaps
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
        <ChevronLeftIcon className="w-4 h-4" /> Prev
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
        Next <ChevronRightIcon className="w-4 h-4" />
      </button>
    </nav>
  );
}

"use client";
import Link from "next/link";
import {
  ArchiveBoxXMarkIcon as PackageSearch,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useRouter, usePathname } from "next/navigation";

export default function EmptyState({
  title = "No products found",
  message,
  showClearFilters = true,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClear = () => {
    router.push(pathname);
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-28 h-28 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
          <PackageSearch
            className="w-14 h-14 text-blue-400"
            strokeWidth={1.2}
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
          <MagnifyingGlassIcon className="w-4 h-4 text-amber-500" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        {message ||
          "We couldn't find any products matching your filters. Try adjusting or clearing them."}
      </p>

      {showClearFilters && (
        <button
          onClick={handleClear}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl
            hover:bg-blue-700 active:scale-95 transition-all duration-150 shadow-sm shadow-blue-200"
        >
          Clear All Filters
        </button>
      )}

      <Link
        href="/categories"
        className="mt-2 text-[#16A34A] text-sm font-semibold hover:underline"
      >
        Browse other categories →
      </Link>
    </div>
  );
}

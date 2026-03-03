"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import CategoryHeader from "./CategoryHeader";
import Sidebar from "./Sidebar";
import ProductGrid from "./ProductGrid";
import Pagination from "@/components/common/Pagination";

/* ── URL-based page navigation wrapper ── */
function CategoryPagination({ currentPage, totalPages }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
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
          <CategoryPagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}

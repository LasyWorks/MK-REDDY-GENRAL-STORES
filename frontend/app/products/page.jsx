"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import {
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";
import { useLanguage } from "@/context/LanguageContext";
import Pagination from "@/components/common/Pagination";
import CustomSelect from "@/components/ui/custom-select";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "discount", label: "Best Discount" },
];

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useLanguage();

  const sort = searchParams.get("sort") || "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1"));

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(pageParam);
  const [activeSort, setActiveSort] = useState(sort);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchProducts = useCallback(
    async (pageNum, sortVal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", PAGE_SIZE);
        params.set("page", pageNum);
        params.set("is_active", "true");
        params.set("lang", lang);

        if (sortVal === "price_asc") {
          params.set("sort_by", "price");
          params.set("sort_order", "asc");
        } else if (sortVal === "price_desc") {
          params.set("sort_by", "price");
          params.set("sort_order", "desc");
        } else if (sortVal === "newest") {
          params.set("sort_by", "created_at");
          params.set("sort_order", "desc");
        } else if (sortVal === "discount") {
          params.set("has_discount", "true");
        }

        const res = await fetch(
          `${API_URL}/products?${params.toString()}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        setProducts(json.data || []);
        setTotal(
          json.pagination?.totalItems ||
            json.pagination?.total ||
            (json.data || []).length,
        );
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  useEffect(() => {
    fetchProducts(page, activeSort);
  }, [page, activeSort, fetchProducts]);

  const handleSort = (value) => {
    setActiveSort(value);
    setPage(1);
    const params = new URLSearchParams();
    if (value) params.set("sort", value);
    router.push(`/products${params.toString() ? `?${params}` : ""}`, {
      scroll: false,
    });
  };

  const handlePageChange = (p) => {
    setPage(p);
    const params = new URLSearchParams();
    if (activeSort) params.set("sort", activeSort);
    if (p > 1) params.set("page", p);
    router.push(`/products${params.toString() ? `?${params}` : ""}`, {
      scroll: true,
    });
  };

  const productGroups = useMemo(
    () => groupProductsByVariant(products),
    [products],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Products</h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {total.toLocaleString()} product{total !== 1 ? "s" : ""}
              {totalPages > 1 && (
                <span className="ml-1">
                  - page {page} of {totalPages}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 select-none hover:border-gray-300 transition-colors">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
            <CustomSelect
              value={activeSort}
              onChange={handleSort}
              options={SORT_OPTIONS}
              buttonClassName="border-0 bg-transparent px-0 py-0 min-w-0 shadow-none focus:ring-0 hover:border-0"
              contentClassName="min-w-[220px]"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(PAGE_SIZE)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl animate-pulse h-64"
            />
          ))}
        </div>
      ) : productGroups.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-lg font-semibold text-gray-700">
            No products found
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Try a different sort option or browse our categories.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {productGroups.map((group, idx) =>
              group.variants.length > 1 ? (
                <ProductCardWithVariants
                  key={`${group.name}-${idx}`}
                  variants={group.variants}
                />
              ) : (
                <ProductCard
                  key={group.variants[0].id}
                  product={group.variants[0]}
                />
              ),
            )}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl animate-pulse h-64" />
            ))}
          </div>
        </div>
      }
    >
      <ProductsPageInner />
    </Suspense>
  );
}

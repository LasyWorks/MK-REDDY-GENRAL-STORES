"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import {
  MagnifyingGlassIcon as Search,
  FireIcon,
} from "@heroicons/react/24/outline";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";
import { useLanguage } from "@/context/LanguageContext";
import Pagination from "@/components/common/Pagination";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const PAGE_SIZE = 20;

function PopularProducts() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/products/popular?limit=20&lang=${lang}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setProducts(json.data || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lang]);

  const groups = useMemo(() => groupProductsByVariant(products), [products]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl animate-pulse h-64" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <FireIcon className="w-5 h-5 text-orange-500" />
        <h2 className="text-base font-semibold text-gray-800">
          Frequently Bought
        </h2>
        <span className="text-xs text-gray-400 font-normal ml-1">
          — popular items customers love
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {groups.map((group, idx) =>
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
    </section>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const { lang } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const search = useCallback(
    async (query, pageNum) => {
      if (!query.trim()) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/products?search=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&page=${pageNum}&is_active=true&lang=${lang}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        setProducts(json.data || []);
        setTotal(
          json.pagination?.total ||
            json.pagination?.totalItems ||
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

  // Reset to page 1 when query changes
  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    search(q, page);
  }, [q, page, search]);
  const productGroups = useMemo(() => {
    return groupProductsByVariant(products);
  }, [products]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!q ? (
        /* ── Empty state: show popular/frequently-bought items ── */
        <div className="space-y-6">
          <h1 className="text-xl font-bold text-gray-900">Search</h1>
          <PopularProducts />
        </div>
      ) : (
        /* ── Search results ── */
        <>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              Search results for{" "}
              <span className="text-blue-600">&ldquo;{q}&rdquo;</span>
            </h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-1">
                {total} product{total !== 1 ? "s" : ""} found
                {totalPages > 1 && (
                  <span className="ml-2 text-gray-400">
                    (page {page} of {totalPages})
                  </span>
                )}
              </p>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 rounded-xl animate-pulse h-64"
                />
              ))}
            </div>
          ) : productGroups.length > 0 ? (
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
                onPageChange={setPage}
              />
            </>
          ) : (
            <div className="flex flex-col items-center py-20 text-center">
              <Search className="w-16 h-16 text-gray-200 mb-4" />
              <h2 className="text-lg font-semibold text-gray-700">
                No results found
              </h2>
              <p className="text-gray-400 mt-1 text-sm">
                Try a different keyword or browse our categories.
              </p>
              <div className="mt-10 w-full">
                <PopularProducts />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default function SearchPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-4">
      <Suspense>
        <SearchPageInner />
      </Suspense>
    </main>
  );
}

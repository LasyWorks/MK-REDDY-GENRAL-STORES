"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { Search } from "lucide-react";
import ProductCard from "@/components/category/ProductCard";
import { useLanguage } from "@/context/LanguageContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

function SearchPageInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const { lang } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const search = useCallback(async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/products?search=${encodeURIComponent(query)}&limit=40&is_active=true&lang=${lang}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setProducts(json.data || []);
      setTotal(json.pagination?.total || (json.data || []).length);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    search(q);
  }, [q, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {q ? (
            <>
              Search results for{" "}
              <span className="text-blue-600">&ldquo;{q}&rdquo;</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        {!loading && q && (
          <p className="text-sm text-gray-500 mt-1">{total} product{total !== 1 ? "s" : ""} found</p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl animate-pulse h-64" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : q ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Search className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">No results found</h2>
          <p className="text-gray-400 mt-1 text-sm">
            Try a different keyword or browse our categories.
          </p>
        </div>
      ) : null}
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

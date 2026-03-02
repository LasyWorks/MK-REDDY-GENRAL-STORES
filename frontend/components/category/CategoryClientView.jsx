"use client";
import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { ChevronRightIcon as ChevronRight } from "@heroicons/react/24/outline";
import SubcategorySidebar from "./SubcategorySidebar";
import ProductGrid from "./ProductGrid";
import InfiniteScroll from "@/components/common/InfiniteScroll";
import { useLanguage } from "@/context/LanguageContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

const PRODUCTS_PER_PAGE = 50;

const productCache = new Map();

async function fetchProducts(categoryId, lang, page = 1, limit = PRODUCTS_PER_PAGE) {
  const key = `${categoryId}-${lang}-${page}`;
  if (productCache.has(key)) return productCache.get(key);

  const res = await fetch(
    `${API_URL}/products?category_id=${categoryId}&limit=${limit}&page=${page}&is_active=true&lang=${lang}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { data: [], hasMore: false };
  
  const json = await res.json();
  const data = json.data || [];
  const hasMore = data.length === limit; // More pages if we got full page
  
  const result = { data, hasMore };
  productCache.set(key, result);
  return result;
}
const categoryCache = new Map();
async function fetchCategoriesLang(lang) {
  if (categoryCache.has(lang)) return categoryCache.get(lang);
  const res = await fetch(
    `${API_URL}/categories?limit=200&is_active=true&lang=${lang}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const data = json.data || [];
  categoryCache.set(lang, data);
  return data;
}
function CategoryClientView({
  mainCategory,
  subcategories,
  initialActiveSubcategory,
}) {
  const { lang } = useLanguage();
  const [displayMain, setDisplayMain] = useState(mainCategory);
  // Filter out subcategories with 0 products on initial render
  const activeSubs0 = subcategories.filter(
    (s) => parseInt(s.product_count || 0) > 0,
  );
  const [displaySubs, setDisplaySubs] = useState(activeSubs0);
  const [activeSubcategory, setActiveSubcategory] = useState(
    initialActiveSubcategory || activeSubs0[0] || null,
  );
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadProducts = useCallback(
    async (categoryId, page = 1, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setProductsLoading(true);
        setProducts([]);
        setCurrentPage(1);
      }
      
      try {
        const result = await fetchProducts(categoryId, lang, page);
        if (append) {
          setProducts(prev => [...prev, ...result.data]);
        } else {
          setProducts(result.data);
        }
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("Failed to load products:", err);
        if (!append) setProducts([]);
        setHasMore(false);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setProductsLoading(false);
        }
      }
    },
    [lang],
  );

  const loadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    const targetId = activeSubcategory?.id || mainCategory?.id;
    if (targetId) {
      loadProducts(targetId, nextPage, true);
    }
  }, [currentPage, activeSubcategory?.id, mainCategory?.id, loadProducts]);
  useEffect(() => {
    let cancelled = false;
    async function localise() {
      if (lang === "en") {
        setDisplayMain(mainCategory);
        // Only show subcategories with at least 1 product
        const activeSubs = subcategories.filter(
          (s) => parseInt(s.product_count || 0) > 0,
        );
        setDisplaySubs(activeSubs);
        setActiveSubcategory((prev) => {
          const match = activeSubs.find((s) => s.id === prev?.id);
          return match || activeSubs[0] || null;
        });
      } else {
        const all = await fetchCategoriesLang(lang);
        if (cancelled || !all) return;
        const newMain =
          all.find((c) => c.id === mainCategory.id) || mainCategory;
        // Only show subcategories with at least 1 product
        const newSubs = all.filter(
          (c) =>
            c.parent_id === mainCategory.id &&
            parseInt(c.product_count || 0) > 0,
        );
        setDisplayMain(newMain);
        setDisplaySubs(newSubs);
        setActiveSubcategory((prev) => {
          const match = newSubs.find((s) => s.id === prev?.id);
          return match || newSubs[0] || null;
        });
      }
    }
    localise();
    return () => {
      cancelled = true;
    };
  }, [lang, mainCategory, subcategories]);
  useEffect(() => {
    const targetId = activeSubcategory?.id || mainCategory?.id;
    if (targetId) loadProducts(targetId);
  }, [activeSubcategory?.id, lang]);
  const handleSubcategoryClick = useCallback(
    (subcat) => {
      setActiveSubcategory(subcat);
      loadProducts(subcat.id);
      window.history.pushState(null, "", `/categories/${subcat.id}`);
    },
    [loadProducts],
  );
  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {}
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-green-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {activeSubcategory && activeSubcategory.id !== displayMain?.id ? (
            <>
              <Link
                href={`/categories/${displayMain?.id}`}
                className="hover:text-green-600 transition-colors whitespace-nowrap"
              >
                {displayMain?.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-900 font-medium whitespace-nowrap">
                {activeSubcategory.name}
              </span>
            </>
          ) : (
            <span className="text-gray-900 font-medium whitespace-nowrap">
              {displayMain?.name}
            </span>
          )}
        </nav>
        <div className="flex flex-col md:flex-row gap-6">
          <SubcategorySidebar
            mainCategory={displayMain}
            subcategories={displaySubs}
            activeSubcategory={activeSubcategory}
            onSubcategoryClick={handleSubcategoryClick}
          />
          <div className="flex-1">
            <InfiniteScroll
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loadingMore}
              threshold={300}
            >
              <ProductGrid
                products={products}
                loading={productsLoading}
                activeSubcategoryName={activeSubcategory?.name}
                mainCategoryName={displayMain?.name}
              />
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  );
}
export default memo(CategoryClientView);

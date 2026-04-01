"use client";
import { useState, useEffect, useCallback, memo, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  XMarkIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import SubcategorySidebar from "./SubcategorySidebar";
import ProductGrid from "./ProductGrid";
import InfiniteScroll from "@/components/common/InfiniteScroll";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

const PRODUCTS_PER_PAGE = 50;

const productCache = new Map();
async function fetchProducts(
  categoryId,
  lang,
  page = 1,
  limit = PRODUCTS_PER_PAGE,
) {
  const key = `${categoryId}-${lang}-${page}`;
  if (productCache.has(key)) return productCache.get(key);
  const res = await fetch(
    `${API_URL}/products?category_id=${categoryId}&limit=${limit}&page=${page}&is_active=true&lang=${lang}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { data: [], hasMore: false };
  const json = await res.json();
  const data = json.data || [];
  const result = { data, hasMore: data.length === limit };
  productCache.set(key, result);
  return result;
}

function CategoryClientView({
  mainCategory,
  subcategories,
  initialActiveSubcategory,
}) {
  const { lang } = useLanguage();
  const { totalCount, openCart } = useCart();
  const router = useRouter();

  const activeSubs0 = subcategories.filter(
    (s) => parseInt(s.product_count || 0) > 0,
  );
  const [displayMain, setDisplayMain] = useState(mainCategory);
  const [displaySubs, setDisplaySubs] = useState(activeSubs0);
  const [activeSubcategory, setActiveSubcategory] = useState(
    initialActiveSubcategory || activeSubs0[0] || null,
  );
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const productsPanelRef = useRef(null);
  const searchInputRef = useRef(null);

  const loadProducts = useCallback(
    async (categoryId, page = 1, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setProductsLoading(true);
        setAllProducts([]);
        setCurrentPage(1);
        setSearchQuery("");
        if (productsPanelRef.current) productsPanelRef.current.scrollTop = 0;
      }
      try {
        const result = await fetchProducts(categoryId, lang, page);
        setAllProducts((prev) =>
          append ? [...prev, ...result.data] : result.data,
        );
        setHasMore(result.hasMore);
      } catch {
        if (!append) setAllProducts([]);
        setHasMore(false);
      } finally {
        if (append) setLoadingMore(false);
        else setProductsLoading(false);
      }
    },
    [lang],
  );

  const loadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    const targetId = activeSubcategory?.id || mainCategory?.id;
    if (targetId) loadProducts(targetId, nextPage, true);
  }, [currentPage, activeSubcategory?.id, mainCategory?.id, loadProducts]);

  useEffect(() => {
    setDisplayMain(mainCategory);
    const activeSubs = subcategories.filter(
      (s) => parseInt(s.product_count || 0) > 0,
    );
    setDisplaySubs(activeSubs);
    setActiveSubcategory((prev) => {
      const match = activeSubs.find((s) => s.id === prev?.id);
      return match || activeSubs[0] || null;
    });
  }, [lang, mainCategory, subcategories]);

  useEffect(() => {
    const targetId = activeSubcategory?.id || mainCategory?.id;
    if (targetId) loadProducts(targetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubcategory?.id, lang]);

  const handleSubcategoryClick = useCallback(
    (subcat) => {
      setActiveSubcategory(subcat);
      loadProducts(subcat.id);
    },
    [loadProducts],
  );

  const toggleSearch = () => {
    setShowSearch((v) => !v);
    if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  const filteredProducts = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allProducts;

  /* ─────────────────────────────────────────────────────────────
     MOBILE VIEW  (hidden on md+)
     Full-screen two-panel layout: left subcats / right products
  ───────────────────────────────────────────────────────────── */
  const mobileView = (
    <div
      className="md:hidden flex flex-col bg-[#F5F5F5]"
      style={{ height: "100dvh" }}
    >
      {/* ── Sticky Header ── */}
      <header
        className="flex-shrink-0 bg-white"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {/* Top bar */}
        <div className="flex items-center h-14 px-2 gap-0.5">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="min-w-[44px] h-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150 flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
          </button>

          {/* Category name */}
          <h1 className="flex-1 text-[15px] font-semibold text-gray-900 text-center truncate px-1">
            {displayMain?.name}
          </h1>

          {/* Search toggle */}
          <button
            onClick={toggleSearch}
            className="min-w-[44px] h-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-90 transition-all duration-150"
            aria-label={showSearch ? "Close search" : "Search products"}
          >
            {showSearch ? (
              <XMarkIcon className="w-5 h-5 text-gray-700" />
            ) : (
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {/* Cart with badge */}
          <button
            onClick={openCart}
            className="min-w-[44px] h-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-90 transition-all duration-150 relative"
            aria-label="Open cart"
          >
            <ShoppingCartIcon className="w-5 h-5 text-gray-700" />
            {totalCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[#16A34A] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </button>
        </div>

        {/* Slide-in search bar */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-out ${
            showSearch ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-3 pb-3">
            <div className="relative flex items-center bg-[#F5F5F5] rounded-xl border border-gray-200 focus-within:border-[#16A34A] transition-colors">
              <MagnifyingGlassIcon className="absolute left-3 w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in "${displayMain?.name}"…`}
                className="w-full bg-transparent pl-9 pr-8 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-gray-400"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Two-Panel Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Subcategory list — 18% width, sticky */}
        <aside
          className="w-[18%] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {displaySubs.length > 0 ? (
            displaySubs.map((subcat) => {
              const isActive = activeSubcategory?.id === subcat.id;
              return (
                <button
                  key={subcat.id}
                  onClick={() => handleSubcategoryClick(subcat)}
                  className={`w-full flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 text-center border-b border-gray-50 last:border-0 relative transition-colors duration-150 min-h-[68px] ${
                    isActive
                      ? "bg-[#F0FAF4]"
                      : "hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  {/* Active left-border indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-[#16A34A] rounded-r-sm" />
                  )}

                  {/* Thumbnail */}
                  <div
                    className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                      isActive
                        ? "bg-green-100 ring-2 ring-[#16A34A]/20"
                        : "bg-gray-100"
                    }`}
                  >
                    {subcat.image_url ? (
                      <img
                        src={subcat.image_url}
                        alt={subcat.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xl">🛒</span>
                    )}
                  </div>

                  {/* Name */}
                  <span
                    className={`text-[10px] leading-tight font-medium line-clamp-2 break-words ${
                      isActive ? "text-[#16A34A] font-bold" : "text-gray-600"
                    }`}
                  >
                    {subcat.name}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-xs text-gray-400 text-center mt-6">
              No subcategories
            </div>
          )}
        </aside>

        {/* Right: Products — 82% width, scrollable */}
        <main
          ref={productsPanelRef}
          className="flex-1 min-w-0 overflow-y-auto bg-[#F5F5F5] px-2 pt-2 pb-20"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {/* Subcategory label + count */}
          {activeSubcategory && !productsLoading && (
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h2 className="text-xs font-semibold text-gray-700 truncate max-w-[160px]">
                {activeSubcategory.name}
              </h2>
              <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "item" : "items"}
              </span>
            </div>
          )}

          <InfiniteScroll
            onLoadMore={loadMore}
            hasMore={hasMore && !searchQuery}
            loading={loadingMore}
            threshold={300}
          >
            <ProductGrid
              products={filteredProducts}
              loading={productsLoading}
              activeSubcategoryName={activeSubcategory?.name}
              mainCategoryName={displayMain?.name}
            />
          </InfiniteScroll>
        </main>
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────
     DESKTOP VIEW  (hidden on <md)
     Classic sidebar + product grid with page-level scroll
  ───────────────────────────────────────────────────────────── */
  const desktopView = (
    <div className="hidden md:block min-h-screen bg-[#F5F5F5] pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center text-sm text-gray-500 gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-green-600 transition-colors">
              Home
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {activeSubcategory && activeSubcategory.id !== displayMain?.id ? (
              <>
                <Link
                  href="/categories"
                  className="hover:text-green-600 transition-colors whitespace-nowrap"
                >
                  {displayMain?.name}
                </Link>
                <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 items-start">
          <SubcategorySidebar
            mainCategory={displayMain}
            subcategories={displaySubs}
            activeSubcategory={activeSubcategory}
            onSubcategoryClick={handleSubcategoryClick}
          />
          <div className="flex-1 min-w-0">
            <InfiniteScroll
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loadingMore}
              threshold={300}
            >
              <ProductGrid
                products={allProducts}
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

  return (
    <>
      {mobileView}
      {desktopView}
    </>
  );
}
export default memo(CategoryClientView);

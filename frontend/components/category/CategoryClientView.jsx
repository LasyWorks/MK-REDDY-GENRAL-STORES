"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SubcategorySidebar from "./SubcategorySidebar";
import ProductGrid from "./ProductGrid";
import { useLanguage } from "@/context/LanguageContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

// Cache keyed by "categoryId-lang" so EN and TE are stored independently
const productCache = new Map();

async function fetchProducts(categoryId, lang) {
  const key = `${categoryId}-${lang}`;
  if (productCache.has(key)) return productCache.get(key);
  const res = await fetch(
    `${API_URL}/products?category_id=${categoryId}&limit=50&is_active=true&lang=${lang}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = await res.json();
  const data = json.data || [];
  productCache.set(key, data);
  return data;
}

// Cache for localised category lists
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

  // Display versions of categories — start with server-fetched (en),
  // swap to localised data when lang changes
  const [displayMain, setDisplayMain] = useState(mainCategory);
  const [displaySubs, setDisplaySubs] = useState(subcategories);
  const [activeSubcategory, setActiveSubcategory] = useState(
    initialActiveSubcategory || subcategories[0] || null,
  );

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const loadProducts = useCallback(
    async (categoryId) => {
      setProductsLoading(true);
      try {
        const data = await fetchProducts(categoryId, lang);
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    },
    [lang],
  );

  // Re-localise category names + reload products when lang changes
  useEffect(() => {
    let cancelled = false;
    async function localise() {
      // For English the server props are already correct
      if (lang === "en") {
        setDisplayMain(mainCategory);
        setDisplaySubs(subcategories);
        setActiveSubcategory((prev) => {
          const match = subcategories.find((s) => s.id === prev?.id);
          return match || subcategories[0] || null;
        });
      } else {
        const all = await fetchCategoriesLang(lang);
        if (cancelled || !all) return;
        const newMain = all.find((c) => c.id === mainCategory.id) || mainCategory;
        const newSubs = all.filter((c) => c.parent_id === mainCategory.id);
        setDisplayMain(newMain);
        setDisplaySubs(newSubs);
        setActiveSubcategory((prev) => {
          const match = newSubs.find((s) => s.id === prev?.id);
          return match || newSubs[0] || null;
        });
      }
    }
    localise();
    return () => { cancelled = true; };
  }, [lang, mainCategory, subcategories]);

  // Reload products when active subcategory OR lang changes
  useEffect(() => {
    const targetId = activeSubcategory?.id || mainCategory?.id;
    if (targetId) loadProducts(targetId);
  }, [activeSubcategory?.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {/* Breadcrumb — Home > Main Category > Subcategory */}
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
            <ProductGrid
              products={products}
              loading={productsLoading}
              activeSubcategoryName={activeSubcategory?.name}
              mainCategoryName={displayMain?.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CategoryClientView);

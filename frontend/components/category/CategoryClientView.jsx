"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import SubcategorySidebar from "./SubcategorySidebar";
import ProductGrid from "./ProductGrid";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

// Module-level cache — persists for the browser session.
// Switching back to a previously visited subcategory returns from memory (~0ms).
const productCache = new Map();

async function fetchProducts(categoryId) {
  if (productCache.has(categoryId)) {
    return productCache.get(categoryId);
  }
  const res = await fetch(
    `${API_URL}/products?category_id=${categoryId}&limit=50&is_active=true`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = await res.json();
  const data = json.data || [];
  productCache.set(categoryId, data);
  return data;
}

/**
 * CategoryClientView
 * Receives server-pre-fetched mainCategory + subcategories as props.
 * Only product data is fetched client-side, on demand (lazy).
 */
function CategoryClientView({
  mainCategory,
  subcategories,
  initialActiveSubcategory,
}) {
  const [activeSubcategory, setActiveSubcategory] = useState(
    initialActiveSubcategory || subcategories[0] || null,
  );
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const loadProducts = useCallback(async (categoryId) => {
    setProductsLoading(true);
    try {
      const data = await fetchProducts(categoryId);
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Lazy-load products only for the active subcategory on mount
  useEffect(() => {
    const targetId = activeSubcategory?.id || mainCategory?.id;
    if (targetId) loadProducts(targetId);
  }, []); // runs once on mount — intentional, not on every re-render

  const handleSubcategoryClick = useCallback(
    (subcat) => {
      setActiveSubcategory(subcat);
      loadProducts(subcat.id);
      // Shallow URL update — no page reload
      window.history.pushState(null, "", `/categories/${subcat.id}`);
    },
    [loadProducts],
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <Link href="/" className="hover:text-green-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {mainCategory?.name}
          </span>
          {activeSubcategory && activeSubcategory.id !== mainCategory?.id && (
            <>
              <span>/</span>
              <span className="text-gray-900 font-medium">
                {activeSubcategory.name}
              </span>
            </>
          )}
        </nav>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar — rendered immediately from server-fetched data, no loading needed */}
          <SubcategorySidebar
            mainCategory={mainCategory}
            subcategories={subcategories}
            activeSubcategory={activeSubcategory}
            onSubcategoryClick={handleSubcategoryClick}
          />

          {/* Product Grid — lazy-loaded client-side on demand */}
          <div className="flex-1">
            <ProductGrid
              products={products}
              loading={productsLoading}
              activeSubcategoryName={activeSubcategory?.name}
              mainCategoryName={mainCategory?.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CategoryClientView);

"use client";

import { memo, useMemo } from "react";
import ProductCard from "./ProductCard";
import ProductCardWithVariants from "./ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse"
        >
          {/* Fixed-height image skeleton matching the card */}
          <div className="w-full bg-gray-200" style={{ height: "200px" }} />
          <div className="px-3 pt-3 pb-3 flex flex-col gap-2">
            <div className="h-3.5 bg-gray-200 rounded w-full" />
            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3 mt-1" />
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
              <div className="h-5 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-200 rounded w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductGrid({
  products,
  loading,
  activeSubcategoryName,
  mainCategoryName,
}) {
  const title = activeSubcategoryName || mainCategoryName;

  // Group products by variants
  const productGroups = useMemo(() => {
    return groupProductsByVariant(products);
  }, [products]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {!loading && (
          <span className="text-sm text-gray-500">
            {productGroups.length} products
          </span>
        )}
      </div>

      {loading ? (
        <ProductGridSkeleton />
      ) : productGroups.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {productGroups.map((group, idx) => (
            group.variants.length > 1 ? (
              <ProductCardWithVariants key={`${group.name}-${idx}`} variants={group.variants} />
            ) : (
              <ProductCard key={group.variants[0].id} product={group.variants[0]} />
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">📦</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No products found
          </h3>
          <p className="text-gray-500">
            We couldn't find any products in this category.
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(ProductGrid);

"use client";

import { memo } from "react";
import ProductCard from "./ProductCard";

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-100 rounded-xl p-3 animate-pulse"
        >
          <div className="w-full aspect-square bg-gray-200 rounded-lg mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="flex justify-between items-center">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {!loading && (
          <span className="text-sm text-gray-500">
            {products.length} products
          </span>
        )}
      </div>

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
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

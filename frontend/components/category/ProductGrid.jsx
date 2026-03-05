"use client";
import { useMemo } from "react";
import LazyProductCard from "./LazyProductCard";
import ProductSkeleton from "./ProductSkeleton";
import EmptyState from "./EmptyState";
import { groupProductsByVariant } from "@/lib/productGrouping";

export default function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-4 sm:gap-4">
        {[...Array(10)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState />;
  }

  // Group products that share a parent_product_id (or brand+name fallback)
  const groups = useMemo(() => groupProductsByVariant(products), [products]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-4 sm:gap-4">
      {groups.map((group, index) => {
        // Show the first (cheapest) variant as the card,
        // attach variant_count so the card shows "X sizes available"
        // and clicking it navigates to the product detail page
        const displayProduct = {
          ...group.variants[0],
          variant_count:
            group.variants.length > 1
              ? group.variants.length - 1
              : group.variants[0].variant_count || 0,
        };
        return (
          <LazyProductCard
            key={displayProduct.id}
            product={displayProduct}
            index={index}
          />
        );
      })}
    </div>
  );
}

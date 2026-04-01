"use client";
import { useMemo } from "react";
import LazyProductCard from "./LazyProductCard";
import ProductSkeleton from "./ProductSkeleton";
import EmptyState from "./EmptyState";
import { groupProductsByVariant } from "@/lib/productGrouping";

export default function ProductGrid({ products, loading }) {
  const groups = useMemo(() => groupProductsByVariant(products), [products]);

  if (loading) {
    return (
      <>
        {/* Mobile: 2-column Grid Skeleton with Vertical Scroll */}
        <div className="sm:hidden grid grid-cols-2 gap-3">
          {[...Array(10)].map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>

        {/* Tablet: 2-column Grid */}
        <div className="hidden sm:grid md:hidden grid-cols-2 gap-5">
          {[...Array(10)].map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(10)].map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Mobile: 2-column Grid with Vertical Scroll */}
      <div className="sm:hidden grid grid-cols-2 gap-3">
        {groups.map((group, index) => {
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

      {/* Tablet: 2-column Grid */}
      <div className="hidden sm:grid md:hidden grid-cols-2 gap-5">
        {groups.map((group, index) => {
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

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((group, index) => {
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

      {/* Custom scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}

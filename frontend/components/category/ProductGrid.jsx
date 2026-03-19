"use client";
import { useMemo } from "react";
import LazyProductCard from "./LazyProductCard";
import ProductSkeleton from "./ProductSkeleton";
import EmptyState from "./EmptyState";
import { groupProductsByVariant } from "@/lib/productGrouping";

export default function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <>
        {/* Mobile: 2×2 Grid Skeleton with Horizontal Scroll */}
        <div className="sm:hidden -mx-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 px-4" style={{ width: "fit-content" }}>
            {[...Array(2)].map((_, chunkIdx) => (
              <div
                key={chunkIdx}
                className="grid grid-cols-2 gap-3 flex-shrink-0"
                style={{ width: "calc(100vw - 2.5rem)" }}
              >
                {[...Array(4)].map((_, i) => (
                  <ProductSkeleton key={`${chunkIdx}-${i}`} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-4 sm:gap-4">
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

  // Group products that share a parent_product_id (or brand+name fallback)
  const groups = useMemo(() => groupProductsByVariant(products), [products]);

  return (
    <>
      {/* Mobile: 2×2 Grid with Horizontal Scroll - Exact 2 Cards Per Row */}
      <div className="sm:hidden -mx-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4" style={{ width: "fit-content" }}>
          {/* Group products in 2×2 chunks */}
          {Array.from(
            { length: Math.ceil(groups.length / 4) },
            (_, chunkIdx) => chunkIdx,
          ).map((chunkIdx) => (
            <div
              key={chunkIdx}
              className="grid grid-cols-2 gap-3 flex-shrink-0"
              style={{ width: "calc(100vw - 2.5rem)" }}
            >
              {groups
                .slice(chunkIdx * 4, (chunkIdx + 1) * 4)
                .map((group, index) => {
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
          ))}
        </div>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-4 sm:gap-4">
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

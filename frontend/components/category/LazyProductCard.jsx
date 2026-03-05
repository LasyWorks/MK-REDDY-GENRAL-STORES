"use client";
import { memo, useState, useRef, useEffect } from "react";
import ProductCard from "./ProductCard";

/**
 * LazyProductCard - Only renders ProductCard when visible in viewport
 * Improves performance for large product lists
 */
function LazyProductCard({ product, index = 0 }) {
  const [isVisible, setIsVisible] = useState(index < 8); // Load first 8 immediately
  const ref = useRef(null);

  useEffect(() => {
    if (isVisible) return; // Already visible

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0.01,
      },
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [isVisible]);

  return (
    <div ref={ref} className="h-full">
      {isVisible ? (
        <ProductCard product={product} />
      ) : (
        // Placeholder skeleton matching new card design
        <div className="bg-white border border-gray-100 rounded-[14px] md:rounded-2xl overflow-hidden shadow-sm animate-pulse">
          <div className="w-full bg-gray-100" style={{ height: "115px" }} />
          <div className="px-4 pt-3 pb-3 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded w-3/4" />
            <div className="h-3.5 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-1/3 mt-1" />
            <div className="h-5 bg-gray-100 rounded w-2/5 mt-2" />
            <div className="h-[46px] md:h-[34px] bg-gray-100 rounded-[12px] md:rounded-full mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(LazyProductCard);

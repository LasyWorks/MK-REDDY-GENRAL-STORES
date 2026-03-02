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
      }
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
        // Placeholder skeleton
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full animate-pulse">
          <div className="aspect-square bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-8 bg-gray-100 rounded mt-4" />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(LazyProductCard);

"use client";
import { useEffect, useRef, useCallback } from "react";

/**
 * InfiniteScroll - Trigger callback when user scrolls near bottom
 * Used for loading more products/items on scroll
 */
export default function InfiniteScroll({
  children,
  onLoadMore,
  hasMore = true,
  loading = false,
  threshold = 400, // pixels from bottom to trigger
  loader = null,
}) {
  const observerRef = useRef(null);
  const loaderRef = useRef(null);

  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const currentLoader = loaderRef.current;
    const options = {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);

    if (currentLoader) {
      observerRef.current.observe(currentLoader);
    }

    return () => {
      if (observerRef.current && currentLoader) {
        observerRef.current.unobserve(currentLoader);
      }
    };
  }, [handleObserver, threshold]);

  return (
    <>
      {children}
      {hasMore && (
        <div ref={loaderRef} className="w-full py-8">
          {loading ? (
            loader || (
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )
          ) : (
            <div className="h-1" /> 
          )}
        </div>
      )}
    </>
  );
}

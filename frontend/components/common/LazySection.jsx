"use client";
import { useEffect, useRef, useState } from "react";

/**
 * LazySection - Load content only when visible in viewport
 * Uses IntersectionObserver for optimal performance
 */
export default function LazySection({
  children,
  className = "",
  fallback = null,
  rootMargin = "200px", // Start loading 200px before visible
  threshold = 0.01,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    // Use IntersectionObserver to detect when section enters viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing (lazy load once)
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [rootMargin, threshold]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}

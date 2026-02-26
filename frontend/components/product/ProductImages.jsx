"use client";
import { useState, useRef, useCallback } from "react";
import { ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import ImageWithFallback from "@/components/common/ImageWithFallback";

const VIEW_LABELS = [
  "Front",
  "Back",
  "Nutrition",
  "Detail",
  "View 5",
  "View 6",
];

export default function ProductImages({
  images = [],
  productName = "",
  isOutOfStock = false,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imgRef = useRef(null);

  const safeImages = images.length > 0 ? images : [null];
  const mainSrc = safeImages[activeIndex];

  const handleMouseMove = useCallback((e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  }, []);

  const goPrev = () =>
    setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* -- Main Image with hover zoom (#3, #4) -- */}
      <div
        ref={imgRef}
        className="relative flex items-center justify-center bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-zoom-in group"
        style={{ minHeight: 360 }}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center rounded-2xl">
            <span className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow">
              Out of Stock
            </span>
          </div>
        )}

        {/* Zoom hint */}
        {!isOutOfStock && !zoomed && (
          <div className="absolute bottom-3 right-3 z-10 bg-black/30 text-white rounded-full p-1.5 pointer-events-none">
            <ZoomIn className="w-4 h-4" />
          </div>
        )}

        {/* Nav arrows (multi-image) */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </>
        )}

        {/* Image counter */}
        {safeImages.length > 1 && (
          <div className="absolute top-3 right-3 z-10 bg-black/40 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {activeIndex + 1}/{safeImages.length}
          </div>
        )}

        {/* Image with magnification */}
        <div
          className={`w-full h-80 sm:h-96 lg:h-112 p-4 transition-transform duration-200 ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
          style={
            zoomed && !isOutOfStock
              ? {
                  transform: "scale(2.5)",
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                  transition: "transform-origin 0s",
                }
              : { transform: "scale(1)", transformOrigin: "center" }
          }
        >
          <ImageWithFallback
            src={mainSrc}
            alt={productName}
            className="w-full h-full object-contain"
            size="lg"
          />
        </div>
      </div>

      {/* -- Thumbnails -- */}
      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {safeImages.map((url, i) => {
            const label = VIEW_LABELS[i] || `View ${i + 1}`;
            const isActive = i === activeIndex;
            return (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                title={label}
                className="shrink-0 flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-white transition-all duration-150 ${isActive ? "border-blue-500 ring-2 ring-blue-100 shadow-md" : "border-gray-200 hover:border-blue-300"}`}
                >
                  <ImageWithFallback
                    src={url}
                    alt={label}
                    className="w-full h-full object-contain p-1"
                    size="sm"
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${isActive ? "text-blue-600" : "text-gray-400"}`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

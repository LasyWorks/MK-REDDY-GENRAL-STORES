"use client";

import { memo } from "react";
import ImageWithFallback from "../common/ImageWithFallback";

function ProductCard({ product }) {
  const mrp = parseFloat(product.mrp || 0);
  const price = parseFloat(product.price || 0);
  const hasDiscount = mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;

  return (
    <div className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200 h-full">

      {/* ── Image box: fixed 200px, never grows or shrinks ── */}
      <div className="relative w-full bg-gray-50" style={{ height: "200px" }}>
        {hasDiscount && (
          <span className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {discountPercent}% off
          </span>
        )}
        <div className="w-full h-full p-3">
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain"
            size="lg"
          />
        </div>
      </div>

      {/* ── Text + action: grows to fill remaining height ── */}
      <div className="flex flex-col flex-1 px-3 pt-3 pb-3 gap-1">

        {/* Product name — exactly 2 lines, then truncate */}
        <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.6rem]">
          {product.name}
        </h3>

        {/* Unit / variant */}
        <p className="text-xs text-gray-400">
          {product.unit_pack_size || product.unit_type || "1 unit"}
        </p>

        {/* Spacer pushes price row to the bottom */}
        <div className="flex-1" />

        {/* ── Price row ── */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">
              ₹{price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through leading-none">
                ₹{mrp.toFixed(2)}
              </span>
            )}
          </div>

          <button
            className="border border-green-600 text-green-700 text-xs font-bold px-4 py-1.5 rounded-lg
              hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
          >
            ADD
          </button>
        </div>

      </div>
    </div>
  );
}

export default memo(ProductCard);

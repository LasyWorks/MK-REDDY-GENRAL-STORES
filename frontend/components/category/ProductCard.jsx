"use client";

import { memo } from "react";

function ProductCard({ product }) {
  const hasDiscount = product.compare_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compare_price - product.price) / product.compare_price) * 100,
      )
    : 0;

  return (
    <div className="border border-gray-100 rounded-xl p-3 hover:shadow-md transition-shadow bg-white relative flex flex-col h-full">
      {/* Discount Tag */}
      {hasDiscount && (
        <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-tl-xl rounded-br-lg z-10">
          {discountPercent}% OFF
        </div>
      )}

      {/* Product Image */}
      <div className="w-full aspect-square relative mb-3 p-2">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Product Title */}
      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 flex-1">
        {product.name}
      </h3>

      {/* Weight/Volume */}
      <p className="text-xs text-gray-500 mb-3">{product.unit || "1 unit"}</p>

      {/* Price & Add Button */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900">
            ₹{product.price}
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">
              ₹{product.compare_price}
            </span>
          )}
        </div>

        <button className="border border-green-600 text-green-600 bg-green-50 hover:bg-green-600 hover:text-white transition-colors px-4 py-1.5 rounded-lg text-xs font-bold">
          ADD
        </button>
      </div>
    </div>
  );
}

// memo prevents re-render if the same product prop is passed again
export default memo(ProductCard);

"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";

function ProductCard({ product }) {
  const mrp = parseFloat(product.mrp || 0);
  const price = parseFloat(product.price || 0);
  const hasDiscount = mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;

  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;

  const { items, addItem, updateQty } = useCart();
  const { productPromoMap } = usePromotions();
  const promo = productPromoMap[product.id] || null;
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity ?? 0;

  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault(); // don't navigate when clicking ADD inside the card link
    if (isOutOfStock) return;
    setAdding(true);
    await addItem(product, 1);
    setTimeout(() => setAdding(false), 300);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200 h-full"
    >
      {/* ── Image box: fixed 200px ── */}
      <div className="relative w-full bg-gray-50" style={{ height: "200px" }}>
        {/* Promotion badge — top-right */}
        {promo && !isOutOfStock && (
          <span
            className="absolute top-2 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse-glow"
            style={{ backgroundColor: promo.theme_color || "#FF6B00" }}>
            {promo.badge_text || "OFFER"}
          </span>
        )}
        {hasDiscount && !isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {discountPercent}% off
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            Out of Stock
          </span>
        )}
        <div className="w-full h-full p-3">
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-contain ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
            size="lg"
          />
        </div>
      </div>

      {/* ── Text + action ── */}
      <div className="flex flex-col flex-1 px-3 pt-3 pb-3 gap-1">
        <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.6rem]">
          {product.name}
        </h3>

        <p className="text-xs text-gray-400">
          {product.unit_pack_size || product.unit_type || "1 unit"}
        </p>

        {/* Promo countdown */}
        {promo?.ends_at && !isOutOfStock && (
          <CountdownTimer endsAt={promo.ends_at} compact themeColor={promo.theme_color} className="mt-0.5" />
        )}

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

          {/* ADD / qty controls */}
          {isOutOfStock ? (
            <span className="text-xs text-red-400 font-medium">Unavailable</span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="border border-green-600 text-green-700 text-xs font-bold px-4 py-1.5 rounded-lg
                hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-60"
            >
              ADD
            </button>
          ) : (
            <div
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1 border border-green-500 rounded-lg overflow-hidden"
            >
              <button
                onClick={(e) => { e.preventDefault(); updateQty(product.id, qty - 1); }}
                className="px-2 py-1 hover:bg-green-50 text-green-700 transition-colors"
                aria-label="Decrease"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold text-gray-900 min-w-[18px] text-center">
                {qty}
              </span>
              <button
                onClick={(e) => { e.preventDefault(); updateQty(product.id, qty + 1); }}
                disabled={qty >= (product.stock_quantity ?? 99)}
                className="px-2 py-1 hover:bg-green-50 text-green-700 transition-colors disabled:opacity-40"
                aria-label="Increase"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default memo(ProductCard);


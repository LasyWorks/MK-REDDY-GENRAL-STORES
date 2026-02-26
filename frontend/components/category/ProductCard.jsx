"use client";
import { memo, useState } from "react";
import Link from "next/link";
import { Plus, Minus, Star, Eye, ShoppingCart } from "lucide-react";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";

/* Inline star rating — no extra dependency */
function StarRating({ value = 0, count = 0 }) {
  const rounded = Math.round(value * 2) / 2; // nearest 0.5
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-[1px]">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rounded >= star;
          const half = !filled && rounded >= star - 0.5;
          return (
            <span key={star} className="relative w-3 h-3 inline-block">
              {/* grey base */}
              <Star
                className="absolute inset-0 w-3 h-3 text-gray-200"
                fill="currentColor"
              />
              {/* coloured fill */}
              {(filled || half) && (
                <span
                  className="absolute inset-0 overflow-hidden text-yellow-400"
                  style={{ width: half ? "50%" : "100%" }}
                >
                  <Star className="w-3 h-3" fill="currentColor" />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {count > 0 && (
        <span className="text-[10px] text-gray-400">
          ({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})
        </span>
      )}
    </div>
  );
}

function ProductCard({ product }) {
  const mrp = parseFloat(product.mrp || 0);
  const price = parseFloat(product.price || 0);
  const hasDiscount = mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;
  const rating = parseFloat(product.rating || product.avg_rating || 0);
  const reviewCount = parseInt(
    product.review_count || product.ratings_count || 0,
  );

  const { items, addItem, updateQty } = useCart();
  const { productPromoMap } = usePromotions();
  const promo = productPromoMap[product.id] || null;
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    setAdding(true);
    await addItem(product, 1);
    setTimeout(() => setAdding(false), 300);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden
        hover:shadow-2xl hover:border-blue-200 hover:-translate-y-1
        transition-all duration-300 ease-out h-full"
    >
      {/* ── Image ── */}
      <div className="relative w-full bg-gray-50 aspect-square overflow-hidden">
        {/* Badges */}
        {promo && !isOutOfStock && (
          <span
            className="absolute top-2 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
            style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
          >
            {promo.badge_text || "OFFER"}
          </span>
        )}
        {hasDiscount && !isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            {discountPercent}% off
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Out of Stock
          </span>
        )}

        {/* Image with zoom */}
        <div className="w-full h-full flex items-center justify-center p-3 transition-transform duration-500 group-hover:scale-105">
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-contain ${isOutOfStock ? "opacity-40 grayscale" : ""}`}
            size="lg"
          />
        </div>

        {/* Quick View overlay — appears on hover */}
        {!isOutOfStock && (
          <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <span
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-white transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/products/${product.id}`;
              }}
            >
              <Eye className="w-3 h-3" />
              Quick View
            </span>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-1">
        {/* Brand */}
        {product.brand && (
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide truncate">
            {product.brand}
          </p>
        )}

        {/* Name */}
        <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.6rem]">
          {product.name}
        </h3>

        {/* Unit */}
        <p className="text-[11px] text-gray-400">
          {product.unit_pack_size || product.unit_type || "1 unit"}
        </p>

        {/* Rating */}
        {rating > 0 ? (
          <StarRating value={rating} count={reviewCount} />
        ) : (
          <span className="text-[10px] text-gray-400 italic">
            No reviews yet
          </span>
        )}

        {/* Countdown timer */}
        {promo?.ends_at && !isOutOfStock && (
          <CountdownTimer
            endsAt={promo.ends_at}
            compact
            themeColor={promo.theme_color}
            className="mt-0.5"
          />
        )}

        <div className="flex-1" />

        {/* ── Price + Add to Cart ── */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-900 leading-tight">
              ₹{price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through leading-none">
                ₹{mrp.toFixed(2)}
              </span>
            )}
          </div>

          {isOutOfStock ? (
            <span className="text-xs text-red-400 font-medium">
              Unavailable
            </span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg
                hover:bg-blue-600 active:scale-95 transition-all duration-150 disabled:opacity-60 shadow-sm"
            >
              {adding ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              ADD
            </button>
          ) : (
            <div
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-0 bg-blue-500 rounded-lg overflow-hidden shadow-sm"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  updateQty(product.id, qty - 1);
                }}
                className="px-2 py-1.5 hover:bg-blue-600 text-white transition-colors"
                aria-label="Decrease"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold text-white min-w-[22px] text-center py-1.5">
                {qty}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  updateQty(product.id, qty + 1);
                }}
                disabled={qty >= (product.stock_quantity ?? 99)}
                className="px-2 py-1.5 hover:bg-blue-600 text-white transition-colors disabled:opacity-40"
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

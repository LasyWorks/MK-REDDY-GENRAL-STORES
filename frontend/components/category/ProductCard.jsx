"use client";
import { memo, useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Minus, Clock } from "lucide-react";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
import secureStorage from "@/lib/secureStorage";

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
  const [isWholesale, setIsWholesale] = useState(false);

  useEffect(() => {
    const userRaw = secureStorage.getItem("user");
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setIsWholesale(
          user.user_type === "wholesale" || user.role === "wholesale_customer",
        );
      } catch (e) {
        setIsWholesale(false);
      }
    }
  }, []);

  const maxQuantity = isWholesale ? 999999 : product.max_order_quantity || 10;
  const atMaxQuantity = !isWholesale && qty >= maxQuantity;

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
      className="group relative flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden
        hover:shadow-lg hover:-translate-y-0.5
        transition-all duration-200 ease-out h-full"
    >
      {/* ── Image area ── */}
      <div className="relative w-full bg-white aspect-square overflow-hidden">
        {/* Discount badge — blue square top-left (Blinkit style) */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-0 left-0 z-10 bg-blue-600 text-white text-[10px] font-extrabold leading-tight px-1.5 py-1 text-center min-w-[36px]">
            <div>{discountPercent}%</div>
            <div>OFF</div>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute top-0 left-0 z-10 bg-red-500 text-white text-[10px] font-extrabold leading-tight px-1.5 py-1 text-center">
            <div>OUT</div>
            <div>OF</div>
            <div>STOCK</div>
          </div>
        )}
        {/* Promo badge top-right */}
        {promo && !isOutOfStock && (
          <span
            className="absolute top-2 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
            style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
          >
            {promo.badge_text || "OFFER"}
          </span>
        )}

        {/* Product image */}
        <div className="w-full h-full flex items-center justify-center p-4 transition-transform duration-300 group-hover:scale-105">
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-contain ${isOutOfStock ? "opacity-40 grayscale" : ""}`}
            size="lg"
          />
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 px-3 pt-2 pb-3 gap-1.5">
        {/* Delivery time */}
        <div className="flex items-center gap-1 text-gray-400">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] font-semibold tracking-wide uppercase">
            8 Mins
          </span>
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.6rem]">
          {product.name}
        </h3>

        {/* Unit / weight */}
        <p className="text-[12px] text-gray-500">
          {product.unit_pack_size || product.unit_type || "1 unit"}
        </p>

        {/* Countdown timer if promo */}
        {promo?.ends_at && !isOutOfStock && (
          <CountdownTimer
            endsAt={promo.ends_at}
            compact
            themeColor={promo.theme_color}
          />
        )}

        <div className="flex-1" />

        {/* ── Price + ADD button ── */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-900 leading-tight">
              ₹{Math.round(price)}
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-gray-400 line-through leading-none">
                ₹{Math.round(mrp)}
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
              className="text-green-600 border border-green-500 bg-white text-xs font-bold px-4 py-1.5 rounded-lg
                hover:bg-green-50 active:scale-95 transition-all duration-150 disabled:opacity-60 min-w-[56px]"
            >
              {adding ? (
                <span className="inline-block w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                "ADD"
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <div
                onClick={(e) => e.preventDefault()}
                className="flex items-center border border-green-500 rounded-lg overflow-hidden"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    updateQty(product.id, qty - 1);
                  }}
                  className="px-2 py-1.5 hover:bg-green-50 text-green-600 transition-colors font-bold"
                  aria-label="Decrease"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-green-600 min-w-[22px] text-center py-1.5">
                  {qty}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    updateQty(product.id, qty + 1);
                  }}
                  disabled={
                    atMaxQuantity || qty >= (product.stock_quantity ?? 99)
                  }
                  className="px-2 py-1.5 hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40 font-bold"
                  aria-label="Increase"
                  title={atMaxQuantity ? `Max ${maxQuantity} per order` : ""}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {atMaxQuantity && (
                <span className="text-[9px] text-orange-500 font-medium text-center">
                  Max {maxQuantity} per order
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
export default memo(ProductCard);

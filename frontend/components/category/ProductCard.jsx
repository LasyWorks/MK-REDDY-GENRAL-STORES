"use client";
import { memo, useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusIcon as Plus,
  MinusIcon as Minus,
} from "@heroicons/react/24/outline";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
import secureStorage from "@/lib/secureStorage";

// ── Product tag badges ────────────────────────────────────────────────────────
function getProductTags(product) {
  const tags = [];
  if (product.created_at) {
    const daysOld =
      (Date.now() - new Date(product.created_at).getTime()) / 86400000;
    if (daysOld <= 30) tags.push("new");
  }
  const price = parseFloat(product.price || 0);
  const mrp = parseFloat(product.mrp || 0);
  if (mrp > price && price > 0 && ((mrp - price) / mrp) * 100 >= 20)
    tags.push("hot");
  const stock = product.stock_quantity ?? 999;
  if (stock > 0 && stock <= 5) tags.push("limited");
  return tags.slice(0, 2);
}
const TAG_CFG = {
  new: { label: "New", cls: "bg-blue-100 text-blue-700" },
  hot: { label: "Hot Deal", cls: "bg-orange-100 text-orange-700" },
  limited: { label: "Limited", cls: "bg-red-100 text-red-600" },
};

function ProductCard({ product }) {
  const mrp = parseFloat(product.mrp || 0);
  const price = parseFloat(product.price || 0);
  const wholesalePrice = product.wholesale_price
    ? parseFloat(product.wholesale_price)
    : null;
  const hasDiscount = mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;

  const { items, addItem, updateQty } = useCart();
  const { productPromoMap, wholesaleDiscountPct } = usePromotions();
  const promo = productPromoMap[product.id] || null;
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const [adding, setAdding] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [isWholesale, setIsWholesale] = useState(false);

  useEffect(() => {
    const userRaw = secureStorage.getItem("user");
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setIsWholesale(
          user.user_type === "wholesale" || user.role === "wholesale_customer",
        );
      } catch {
        setIsWholesale(false);
      }
    }
  }, []);

  const maxQuantity = isWholesale ? 999999 : product.max_order_quantity || 10;
  const atMaxQuantity = !isWholesale && qty >= maxQuantity;

  // Resolve the actual wholesale price: use per-product price if available,
  // otherwise fall back to the store-wide discount percentage.
  const fallbackWsPrice =
    isWholesale && !wholesalePrice && wholesaleDiscountPct > 0
      ? parseFloat((price * (1 - wholesaleDiscountPct / 100)).toFixed(2))
      : null;
  const resolvedWsPrice = wholesalePrice || fallbackWsPrice;
  const effectivePrice =
    isWholesale && resolvedWsPrice ? resolvedWsPrice : price;
  const showWsRate = isWholesale && resolvedWsPrice && resolvedWsPrice < price;
  const wsSavingsPct = showWsRate
    ? Math.round(((price - resolvedWsPrice) / price) * 100)
    : 0;

  // Promotion price: the price the customer actually pays after promo discount
  const promoDiscAmt =
    promo && !isOutOfStock && promo.discount_value
      ? promo.discount_type === "percentage"
        ? parseFloat(
            ((price * parseFloat(promo.discount_value)) / 100).toFixed(2),
          )
        : Math.min(parseFloat(promo.discount_value), price)
      : 0;
  const promoPrice = promoDiscAmt > 0 ? price - promoDiscAmt : null;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    setAdding(true);
    setBounce(true);
    await addItem(product, 1);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cartItemAdded"));
    }
    setTimeout(() => setAdding(false), 300);
    setTimeout(() => setBounce(false), 400);
  };

  // ── Wholesale card ──────────────────────────────────────────────────────
  if (isWholesale) {
    return (
      <Link
        href={`/products/${product.id}`}
        className={`group relative flex flex-col bg-white rounded-[14px] md:rounded-2xl overflow-hidden
          border shadow-sm active:scale-[0.97] hover:shadow-md transition-all duration-150 ease-out h-full
          min-h-0 sm:min-h-auto
          ${isOutOfStock ? "opacity-60 border-gray-200" : "border-amber-200 hover:border-amber-300"}`}
      >
        {/* Wholesale stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-[14px] md:rounded-t-2xl" />

        {/* ── Image ── */}
        <div
          className="relative w-full bg-amber-50/30"
          style={{ height: "clamp(80px, 30vw, 115px)" }}
        >
          {/* Wholesale savings badge */}
          {showWsRate && !isOutOfStock && (
            <span className="absolute top-3 left-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight">
              WS -{wsSavingsPct}%
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-md">
                Out of Stock
              </span>
            </div>
          )}
          {promo && !isOutOfStock && (
            <span
              className="absolute top-3 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
              style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
            >
              {promo.badge_text || "OFFER"}
            </span>
          )}
          <div className="w-full h-full flex items-center justify-center p-3">
            <ImageWithFallback
              src={product.image_url}
              alt={product.name}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 ${isOutOfStock ? "grayscale" : ""}`}
              size="lg"
            />
          </div>
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 px-3 pt-2 pb-2 md:px-2.5 md:pt-2 md:pb-2.5 min-h-0 sm:min-h-auto">
          {/* Wholesale badge */}
          <span className="self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 mb-1 uppercase tracking-wide">
            Wholesale
          </span>

          <h3 className="text-[13px] md:text-[13px] font-semibold text-gray-800 leading-[1.15rem] line-clamp-2 min-h-[2.3rem] break-words">
            {product.name}
          </h3>

          <p className="text-[11px] md:text-[11px] text-gray-500 mt-0.5 mb-0.5 line-clamp-1">
            {product.unit_pack_size || product.unit_type || "1 unit"}
          </p>

          {parseInt(product.variant_count || 0) > 0 && (
            <span className="text-[12px] md:text-[10px] font-semibold text-amber-600 mb-1">
              +{parseInt(product.variant_count)} more sizes
            </span>
          )}

          {promo?.ends_at && !isOutOfStock && (
            <CountdownTimer
              endsAt={promo.ends_at}
              compact
              themeColor={promo.theme_color}
            />
          )}

          <div className="flex-1" />

          {/* Price block */}
          <div className="mt-3 md:mt-1.5 flex flex-col md:flex-row md:items-center md:justify-between md:gap-2">
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[16px] md:text-[14px] font-bold text-amber-700 leading-tight">
                  &#x20b9;{Math.round(effectivePrice)}
                </span>
                {showWsRate && (
                  <span className="text-[11px] md:text-[10px] text-gray-400 line-through leading-none">
                    MRP &#x20b9;{Math.round(price)}
                  </span>
                )}
              </div>
              {showWsRate && (
                <p className="text-[9px] text-amber-600 font-semibold">
                  Wholesale rate
                </p>
              )}
            </div>

            <div className="mt-2 md:mt-0 md:shrink-0">
              {isOutOfStock ? (
                <span className="text-[11px] text-gray-400 font-medium">
                  N/A
                </span>
              ) : qty === 0 ? (
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className={`w-full md:w-[58px] h-[46px] md:h-[34px] rounded-[12px] md:rounded-full
                    border-2 border-amber-500 text-amber-600 text-[14px] md:text-[12px] font-bold bg-white
                    hover:bg-amber-50 active:scale-[0.97] transition-all duration-150 disabled:opacity-60
                    flex items-center justify-center shadow-sm
                    ${bounce ? "animate-bounce-once" : ""}`}
                >
                  {adding ? (
                    <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    "ADD"
                  )}
                </button>
              ) : (
                <div
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center bg-amber-500 rounded-[12px] md:rounded-full overflow-hidden h-[46px] md:h-[34px] md:w-[80px]"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      updateQty(product.id, qty - 1);
                    }}
                    className="w-12 md:w-9 h-full flex items-center justify-center text-white hover:bg-amber-600 transition-colors font-bold"
                    aria-label="Decrease"
                  >
                    <Minus className="w-4 h-4 md:w-3 md:h-3" />
                  </button>
                  <span className="flex-1 text-center text-[15px] md:text-[13px] font-bold text-white select-none">
                    {qty}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      updateQty(product.id, qty + 1);
                    }}
                    disabled={qty >= (product.stock_quantity ?? 99)}
                    className="w-12 md:w-9 h-full flex items-center justify-center text-white hover:bg-amber-600 transition-colors disabled:opacity-40 font-bold"
                    aria-label="Increase"
                  >
                    <Plus className="w-4 h-4 md:w-3 md:h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Retail card (original layout) ──────────────────────────────────────
  return (
    <Link
      href={`/products/${product.id}`}
      className={`group relative flex flex-col bg-white rounded-[14px] md:rounded-2xl overflow-hidden
        border border-gray-100 shadow-sm
        active:scale-[0.97] hover:shadow-md
        transition-all duration-150 ease-out h-full
        min-h-0 sm:min-h-auto
        ${isOutOfStock ? "opacity-60" : ""}`}
    >
      {/* ── Image ── */}
      <div
        className="relative w-full bg-gray-50"
        style={{ height: "clamp(80px, 30vw, 115px)" }}
      >
        {hasDiscount && !isOutOfStock && (
          <span className="absolute top-2 left-2 z-10 bg-[#FF4D4F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight">
            {discountPercent}% OFF
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-md">
              Out of Stock
            </span>
          </div>
        )}
        {promo && !isOutOfStock && (
          <span
            className="absolute top-2 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
            style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
          >
            {promo.badge_text || "OFFER"}
          </span>
        )}
        <div className="w-full h-full flex items-center justify-center p-3">
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            className={`max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 ${isOutOfStock ? "grayscale" : ""}`}
            size="lg"
          />
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 px-3 pt-2 pb-2 md:px-2.5 md:pt-2 md:pb-2.5 min-h-0 sm:min-h-auto">
        <h3 className="text-[13px] md:text-[13px] font-semibold text-gray-800 leading-[1.15rem] line-clamp-2 min-h-[2.3rem] break-words">
          {product.name}
        </h3>

        {(() => {
          const tags = getProductTags(product);
          if (!tags.length) return null;
          return (
            <div className="flex gap-1 flex-wrap items-center mt-1 mb-0.5 min-h-[1.25rem]">
              {tags.map((t) => (
                <span
                  key={t}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${TAG_CFG[t].cls}`}
                >
                  {TAG_CFG[t].label}
                </span>
              ))}
            </div>
          );
        })()}

        <p className="text-[12px] md:text-[11px] text-gray-400 mt-1.5 md:mt-0.5 mb-1 line-clamp-1">
          {product.unit_pack_size || product.unit_type || "1 unit"}
        </p>

        {parseInt(product.variant_count || 0) > 0 && (
          <span className="text-[12px] md:text-[10px] font-semibold text-[#16A34A] mb-1">
            +{parseInt(product.variant_count)} more sizes
          </span>
        )}

        {promo?.ends_at && !isOutOfStock && (
          <CountdownTimer
            endsAt={promo.ends_at}
            compact
            themeColor={promo.theme_color}
          />
        )}

        <div className="flex-1" />

        <div className="mt-3 md:mt-1.5 flex flex-col md:flex-row md:items-center md:justify-between md:gap-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[16px] md:text-[14px] font-bold text-gray-900 leading-tight">
              &#x20b9;{Math.round(promoPrice != null ? promoPrice : price)}
            </span>
            {((promoPrice != null && price > promoPrice) || hasDiscount) && (
              <span className="text-[11px] md:text-[10px] text-gray-400 line-through leading-none">
                MRP &#x20b9;{Math.round(hasDiscount ? mrp : price)}
              </span>
            )}
          </div>

          <div className="mt-2 md:mt-0 md:shrink-0">
            {isOutOfStock ? (
              <span className="text-[11px] text-gray-400 font-medium">N/A</span>
            ) : qty === 0 ? (
              <button
                onClick={handleAdd}
                disabled={adding}
                className={`w-full md:w-[58px] h-[46px] md:h-[34px] rounded-[12px] md:rounded-full
                border-2 border-[#16A34A]
                text-[#16A34A] text-[14px] md:text-[12px] font-bold bg-white
                hover:bg-green-50 active:scale-[0.97] active:bg-green-100
                transition-all duration-150 disabled:opacity-60
                flex items-center justify-center shadow-sm
                ${bounce ? "animate-bounce-once" : ""}`}
              >
                {adding ? (
                  <span className="w-4 h-4 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin block" />
                ) : (
                  "ADD"
                )}
              </button>
            ) : (
              <div
                onClick={(e) => e.preventDefault()}
                className="flex items-center bg-[#16A34A] rounded-[12px] md:rounded-full overflow-hidden h-[46px] md:h-[34px] md:w-[80px]"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    updateQty(product.id, qty - 1);
                  }}
                  className="w-12 md:w-9 h-full flex items-center justify-center text-white hover:bg-green-700 active:bg-green-800 transition-colors font-bold"
                  aria-label="Decrease"
                >
                  <Minus className="w-4 h-4 md:w-3 md:h-3" />
                </button>
                <span className="flex-1 text-center text-[15px] md:text-[13px] font-bold text-white select-none">
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
                  className="w-12 md:w-9 h-full flex items-center justify-center text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-40 font-bold"
                  aria-label="Increase"
                  title={atMaxQuantity ? `Max ${maxQuantity} per order` : ""}
                >
                  <Plus className="w-4 h-4 md:w-3 md:h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {atMaxQuantity && (
          <p className="text-[9px] text-orange-500 font-medium text-right mt-0.5">
            Max {maxQuantity}/order
          </p>
        )}
      </div>
    </Link>
  );
}
export default memo(ProductCard);

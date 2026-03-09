"use client";
import { memo, useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlusIcon as Plus,
  MinusIcon as Minus,
  XMarkIcon as X,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
import secureStorage from "@/lib/secureStorage";
// ── Product tag badges ────────────────────────────────────────────────────────
function getVariantTags(variant) {
  const tags = [];
  if (variant.created_at) {
    const daysOld =
      (Date.now() - new Date(variant.created_at).getTime()) / 86400000;
    if (daysOld <= 30) tags.push("new");
  }
  const price = parseFloat(variant.price || 0);
  const mrp = parseFloat(variant.mrp || 0);
  if (mrp > price && price > 0 && ((mrp - price) / mrp) * 100 >= 20)
    tags.push("hot");
  const stock = variant.stock_quantity ?? 999;
  if (stock > 0 && stock <= 5) tags.push("limited");
  return tags.slice(0, 2);
}
const TAG_CFG = {
  new: { label: "New", cls: "bg-blue-100 text-blue-700" },
  hot: { label: "Hot Deal", cls: "bg-orange-100 text-orange-700" },
  limited: { label: "Limited", cls: "bg-red-100 text-red-600" },
};
// ─── Price helpers ────────────────────────────────────────────────────────────
function calcPromoPrice(variant, promo) {
  const base = parseFloat(variant.price || 0);
  const mrp = parseFloat(variant.mrp || 0);
  if (!promo || !parseFloat(promo.discount_value || 0)) {
    return {
      display: base,
      strike: mrp > base ? mrp : null,
      badgePct: mrp > base ? Math.round(((mrp - base) / mrp) * 100) : null,
      flatAmt: null,
    };
  }
  const val = parseFloat(promo.discount_value);
  if (promo.discount_type === "percentage") {
    const dp = parseFloat((base * (1 - val / 100)).toFixed(2));
    return {
      display: dp,
      strike: base,
      badgePct:
        mrp > dp ? Math.round(((mrp - dp) / mrp) * 100) : Math.round(val),
      flatAmt: null,
    };
  }
  const dp = parseFloat(Math.max(0, base - val).toFixed(2));
  return {
    display: dp,
    strike: base,
    badgePct: mrp > dp ? Math.round(((mrp - dp) / mrp) * 100) : null,
    flatAmt: val,
  };
}

// ─── VariantRow — one row inside the bottom sheet ────────────────────────────
const VariantRow = memo(function VariantRow({ variant, promo }) {
  const { items, addItem, updateQty } = useCart();
  const { display, strike, badgePct, flatAmt } = calcPromoPrice(variant, promo);
  const cartItem = items.find((i) => i.id === variant.id);
  const qty = cartItem?.quantity ?? 0;
  const outOfStock = (variant.stock_quantity ?? 0) <= 0;
  const label =
    variant.variant ||
    variant.unit_pack_size ||
    variant.unit_type ||
    "Standard";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        outOfStock
          ? "opacity-60 border-gray-100"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
        <ImageWithFallback
          src={variant.image_url}
          alt={variant.name}
          className="w-full h-full object-contain"
          size="sm"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-tight">
          {label}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {badgePct != null && (
            <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {badgePct}% off
            </span>
          )}
          {flatAmt != null && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              ₹{flatAmt} off
            </span>
          )}
          {promo?.badge_text && !badgePct && !flatAmt && (
            <span
              className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
            >
              {promo.badge_text}
            </span>
          )}
        </div>
        {!outOfStock && (variant.stock_quantity ?? 99) < 10 && (
          <p className="text-[10px] text-orange-500 mt-0.5">
            Only {variant.stock_quantity} left
          </p>
        )}
        {outOfStock && (
          <p className="text-[10px] text-red-500 mt-0.5">Out of stock</p>
        )}
      </div>

      {/* Price + action */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="text-right">
          <p className="font-bold text-gray-900 text-sm">
            ₹{Math.round(display)}
          </p>
          {strike != null && strike > display && (
            <p className="text-[11px] text-gray-400 line-through">
              ₹{Math.round(strike)}
            </p>
          )}
        </div>
        {outOfStock ? (
          <span className="text-[10px] text-gray-400">N/A</span>
        ) : qty === 0 ? (
          <button
            onClick={() => addItem(variant, 1)}
            className="border-2 border-[#16A34A] text-[#16A34A] text-[12px] font-bold
              px-4 h-[34px] rounded-full bg-white hover:bg-green-50
              active:scale-95 transition-all duration-150 min-w-[64px]"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center bg-[#16A34A] rounded-full overflow-hidden h-[34px]">
            <button
              onClick={() => updateQty(variant.id, qty - 1)}
              className="w-8 h-full flex items-center justify-center text-white hover:bg-green-700 transition-colors"
              aria-label="Decrease"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-[13px] font-bold text-white select-none">
              {qty}
            </span>
            <button
              onClick={() => updateQty(variant.id, qty + 1)}
              disabled={qty >= (variant.stock_quantity ?? 99)}
              className="w-8 h-full flex items-center justify-center text-white hover:bg-green-700 transition-colors disabled:opacity-40"
              aria-label="Increase"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
function BottomSheet({ open, onClose, product, variants, productPromoMap }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const { items } = useCart();
  const cartTotal = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl
          flex flex-col max-h-[90vh]
          transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-[15px]">
              {product?.name}
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">Select size</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {/* Variant list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              promo={productPromoMap[variant.id] || null}
            />
          ))}
        </div>
        {/* Footer — View Cart */}
        <div className="border-t px-4 py-3 bg-white flex-shrink-0">
          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-[#16A34A] text-white
              font-bold py-3.5 rounded-xl hover:bg-green-700 active:scale-[0.98]
              transition-all duration-150 text-[15px]"
          >
            <ShoppingCartIcon className="w-5 h-5" />
            View Cart
            {cartTotal > 0 && (
              <span className="bg-white text-[#16A34A] text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {cartTotal}
              </span>
            )}
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
function ProductCardWithVariants({ variants }) {
  const { items, addItem, updateQty } = useCart();
  const { productPromoMap, wholesaleDiscountPct } = usePromotions();
  const [showSheet, setShowSheet] = useState(false);
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

  const hasAnyPromo = variants.some((v) => productPromoMap[v.id]);

  const displayVariants = useMemo(() => {
    const pool = hasAnyPromo
      ? variants.filter((v) => productPromoMap[v.id])
      : variants;
    return [...pool].sort((a, b) => {
      const aStock = (a.stock_quantity ?? 0) > 0;
      const bStock = (b.stock_quantity ?? 0) > 0;
      if (aStock !== bStock) return aStock ? -1 : 1;
      return parseFloat(a.price || 0) - parseFloat(b.price || 0);
    });
  }, [variants, hasAnyPromo, productPromoMap]);

  const defaultVariant = useMemo(
    () =>
      displayVariants.find((v) => (v.stock_quantity ?? 0) > 0) ||
      displayVariants[0],
    [displayVariants],
  );

  const promo = productPromoMap[defaultVariant?.id] || null;
  const {
    display: displayPrice,
    strike: cardStrikePrice,
    badgePct: cardBadgePct,
    flatAmt: cardFlatAmt,
  } = calcPromoPrice(defaultVariant || {}, promo);

  // Resolve wholesale effective price: per-variant price, or fallback discount.
  const variantWsPrice = defaultVariant?.wholesale_price
    ? parseFloat(defaultVariant.wholesale_price)
    : null;
  const fallbackWsPrice =
    isWholesale && !variantWsPrice && wholesaleDiscountPct > 0
      ? parseFloat((displayPrice * (1 - wholesaleDiscountPct / 100)).toFixed(2))
      : null;
  const resolvedWsPrice = variantWsPrice || fallbackWsPrice;
  const effectiveDisplayPrice =
    isWholesale && resolvedWsPrice ? resolvedWsPrice : displayPrice;
  const effectiveStrikePrice =
    isWholesale && resolvedWsPrice && resolvedWsPrice < displayPrice
      ? displayPrice
      : cardStrikePrice;

  const isOutOfStock = (defaultVariant?.stock_quantity ?? 0) <= 0;
  const cartItem = items.find((i) => i.id === defaultVariant?.id);
  const qty = cartItem?.quantity ?? 0;
  const maxQuantity = isWholesale
    ? 999999
    : defaultVariant?.max_order_quantity || 10;
  const atMaxQuantity = !isWholesale && qty >= maxQuantity;

  const handleAdd = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOutOfStock || !defaultVariant) return;
      setAdding(true);
      setBounce(true);
      await addItem(defaultVariant, 1);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cartItemAdded"));
      }
      setTimeout(() => setAdding(false), 300);
      setTimeout(() => setBounce(false), 400);
    },
    [defaultVariant, isOutOfStock, addItem],
  );

  const handleSizesClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSheet(true);
  }, []);

  if (!defaultVariant) return null;

  return (
    <>
      {/* Card */}
      <Link
        href={`/products/${defaultVariant.id}`}
        className={`group relative flex flex-col bg-white rounded-[14px] md:rounded-2xl overflow-hidden
          border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.97]
          transition-all duration-150 ease-out h-full
          ${isOutOfStock ? "opacity-60" : ""}`}
      >
        {/* Image */}
        <div className="relative w-full bg-gray-50" style={{ height: "115px" }}>
          {!isOutOfStock && (cardBadgePct != null || cardFlatAmt != null) && (
            <span className="absolute top-2 left-2 z-10 bg-[#FF4D4F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight">
              {cardFlatAmt != null
                ? `₹${cardFlatAmt} off`
                : `${cardBadgePct}% OFF`}
            </span>
          )}
          {promo && !isOutOfStock && (
            <span
              className="absolute top-2 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
              style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
            >
              {promo.badge_text || "OFFER"}
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-md">
                Out of Stock
              </span>
            </div>
          )}
          <div className="w-full h-full flex items-center justify-center p-3">
            <ImageWithFallback
              src={defaultVariant.image_url}
              alt={defaultVariant.name}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 ${isOutOfStock ? "grayscale" : ""}`}
              size="lg"
            />
          </div>
        </div>
        {/* Info */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-3 md:px-2.5 md:pt-2 md:pb-2.5">
          <h3 className="text-[15px] md:text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.8rem] md:min-h-[2.4rem]">
            {defaultVariant.name}
          </h3>

          {/* Tag badges */}
          {(() => {
            const tags = getVariantTags(defaultVariant);
            if (!tags.length) return null;
            return (
              <div className="flex gap-1 flex-wrap mt-0.5 mb-0.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TAG_CFG[t].cls}`}
                  >
                    {TAG_CFG[t].label}
                  </span>
                ))}
              </div>
            );
          })()}

          {displayVariants.length > 1 ? (
            <button
              onClick={handleSizesClick}
              className="text-left text-[12px] md:text-[11px] text-[#16A34A] font-semibold mt-1 mb-1 hover:underline"
            >
              {displayVariants.length} sizes available
            </button>
          ) : (
            <p className="text-[12px] md:text-[11px] text-gray-400 mt-1.5 md:mt-0.5 mb-1 line-clamp-1">
              {defaultVariant.unit_pack_size ||
                defaultVariant.unit_type ||
                "1 unit"}
            </p>
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
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] md:text-[14px] font-bold text-gray-900 leading-tight">
                ₹{Math.round(effectiveDisplayPrice)}
                {displayVariants.length > 1 && (
                  <span className="text-[11px] md:text-[10px] text-gray-400 font-normal ml-0.5">
                    onwards
                  </span>
                )}
              </span>
              {effectiveStrikePrice != null && effectiveStrikePrice > effectiveDisplayPrice && (
                <span className="text-[11px] md:text-[10px] text-gray-400 line-through leading-none">
                  ₹{Math.round(effectiveStrikePrice)}
                </span>
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
                  className={`w-full md:w-[58px] h-[46px] md:h-[34px] rounded-[12px] md:rounded-full border-2 border-[#16A34A] text-[#16A34A] text-[14px] md:text-[12px] font-bold bg-white hover:bg-green-50 active:scale-[0.97] active:bg-green-100 transition-all duration-150 disabled:opacity-60 flex items-center justify-center shadow-sm ${bounce ? "animate-bounce-once" : ""}`}
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
                      updateQty(defaultVariant.id, qty - 1);
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
                      if (
                        !atMaxQuantity &&
                        qty < (defaultVariant.stock_quantity ?? 99)
                      )
                        updateQty(defaultVariant.id, qty + 1);
                    }}
                    disabled={
                      atMaxQuantity ||
                      qty >= (defaultVariant.stock_quantity ?? 99)
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
      {showSheet && (
        <BottomSheet
          open={showSheet}
          onClose={() => setShowSheet(false)}
          product={defaultVariant}
          variants={displayVariants}
          productPromoMap={productPromoMap}
        />
      )}
    </>
  );
}

export default memo(ProductCardWithVariants);

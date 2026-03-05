"use client";
import { memo, useState, useMemo } from "react";
import Link from "next/link";
import {
  PlusIcon as Plus,
  MinusIcon as Minus,
  XMarkIcon as X,
  CubeIcon as Package,
} from "@heroicons/react/24/outline";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
function ProductCardWithVariants({ variants }) {
  const { items, addItem, updateQty } = useCart();
  const { productPromoMap } = usePromotions();
  const hasAnyPromo = variants.some((v) => productPromoMap[v.id]);
  const displayVariants = useMemo(() => {
    // If any variant has promotion, only show those variants (hide non-discounted sizes)
    if (hasAnyPromo) {
      return variants.filter((v) => productPromoMap[v.id]);
    }
    return variants;
  }, [variants, hasAnyPromo, productPromoMap]);
  const previewProduct = displayVariants[0];
  const [showModal, setShowModal] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const mrp = parseFloat(previewProduct.mrp || 0);
  const price = parseFloat(previewProduct.price || 0);
  const isOutOfStock = (previewProduct.stock_quantity ?? 0) <= 0;
  const promo = productPromoMap[previewProduct.id] || null;

  // ── Promo-aware price calculation ────────────────────────────────────────
  const promoType = promo?.discount_type;
  const promoValue = parseFloat(promo?.discount_value || 0);

  let displayPrice = price;
  let cardStrikePrice = null;
  let cardBadgePct = null;
  let cardFlatAmt = null;

  if (promo && promoValue > 0) {
    if (promoType === "percentage") {
      const promoPrice = parseFloat(
        (price * (1 - promoValue / 100)).toFixed(2),
      );
      displayPrice = promoPrice;
      cardStrikePrice = price;
      cardBadgePct =
        mrp > promoPrice
          ? Math.round(((mrp - promoPrice) / mrp) * 100)
          : Math.round(promoValue);
    } else if (promoType === "flat") {
      // Flat = ₹X off this product regardless of quantity
      displayPrice = parseFloat(Math.max(0, price - promoValue).toFixed(2));
      cardStrikePrice = price;
      cardFlatAmt = promoValue;
      if (mrp > displayPrice) {
        cardBadgePct = Math.round(((mrp - displayPrice) / mrp) * 100);
      }
    }
  } else if (mrp > price) {
    cardStrikePrice = mrp;
    cardBadgePct = Math.round(((mrp - price) / mrp) * 100);
  }

  const hasDiscount =
    cardBadgePct != null ||
    cardFlatAmt != null ||
    (cardStrikePrice != null && cardStrikePrice > displayPrice);
  const discountPercent = cardBadgePct ?? 0;
  const handleCardClick = (e) => {
    e.preventDefault();
    setShowModal(true);
  };
  const handleAddClick = (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    // Skip modal if only one size - add directly for faster checkout
    if (displayVariants.length === 1) {
      addItem(displayVariants[0], 1);
      return;
    }
    // Multiple sizes - show size picker modal
    setShowModal(true);
  };
  const handleModalAddToCart = async (variantId) => {
    const variant = displayVariants.find((v) => v.id === variantId);
    if (variant && variant.stock_quantity > 0) {
      await addItem(variant, 1);
    }
  };
  return (
    <>
      <div
        onClick={handleCardClick}
        className={`group flex flex-col bg-white border border-gray-100 rounded-[14px] md:rounded-2xl overflow-hidden
          shadow-sm hover:shadow-md active:scale-[0.97]
          transition-all duration-150 h-full cursor-pointer
          ${isOutOfStock ? "opacity-60" : ""}`}
      >
        {/* Image — fixed 120px matching ProductCard */}
        <div className="relative w-full bg-gray-50" style={{ height: "115px" }}>
          {/* Promo badge top-right */}
          {promo && !isOutOfStock && (
            <span
              className="absolute top-2 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
              style={{ backgroundColor: promo.theme_color || "#FF6B00" }}
            >
              {promo.badge_text || "OFFER"}
            </span>
          )}
          {/* Discount badge top-left */}
          {!isOutOfStock && (cardBadgePct != null || cardFlatAmt != null) && (
            <span className="absolute top-2 left-2 z-10 bg-[#FF4D4F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight">
              {cardFlatAmt != null
                ? `₹${cardFlatAmt} off`
                : `${cardBadgePct}% OFF`}
            </span>
          )}
          {/* Out-of-stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-md">
                Out of Stock
              </span>
            </div>
          )}
          <div className="w-full h-full flex items-center justify-center p-3">
            <ImageWithFallback
              src={previewProduct.image_url}
              alt={previewProduct.name}
              className={`max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? "grayscale" : ""}`}
              size="lg"
            />
          </div>
        </div>
        {/* Info */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-3 md:px-2.5 md:pt-2 md:pb-2.5">
          {/* Name */}
          <h3 className="text-[15px] md:text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.8rem] md:min-h-[2.4rem]">
            {previewProduct.name}
          </h3>
          {/* Size / variants label */}
          {displayVariants.length > 1 ? (
            <p className="text-[12px] md:text-[11px] text-[#16A34A] font-semibold mt-1.5 md:mt-0.5 mb-1">
              {displayVariants.length} sizes available
            </p>
          ) : (
            <p className="text-[12px] md:text-[11px] text-gray-400 mt-1.5 md:mt-0.5 mb-1 line-clamp-1">
              {previewProduct.unit_pack_size ||
                previewProduct.unit_type ||
                "1 unit"}
            </p>
          )}
          {/* Promo countdown */}
          {promo?.ends_at && !isOutOfStock && (
            <CountdownTimer
              endsAt={promo.ends_at}
              compact
              themeColor={promo.theme_color}
              className="mt-0.5"
            />
          )}
          <div className="flex-1" />
          {/* Price */}
          <div className="mt-3 md:mt-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] md:text-[14px] font-bold text-gray-900 leading-tight">
                ₹{Math.round(displayPrice)}
                {displayVariants.length > 1 && (
                  <span className="text-[11px] md:text-[10px] text-gray-400 font-normal ml-0.5">
                    onwards
                  </span>
                )}
              </span>
              {cardStrikePrice != null && cardStrikePrice > displayPrice && (
                <span className="text-[11px] md:text-[10px] text-gray-400 line-through leading-none">
                  ₹{Math.round(cardStrikePrice)}
                </span>
              )}
            </div>
          </div>
          {/* ADD / SELECT button */}
          <div className="mt-2 md:mt-1.5">
            {isOutOfStock ? (
              <span className="text-[11px] text-gray-400 font-medium">N/A</span>
            ) : (
              <button
                onClick={handleAddClick}
                className="w-full h-[46px] md:h-[34px] rounded-[12px] md:rounded-full
                  border-2 border-[#16A34A]
                  text-[#16A34A] text-[14px] md:text-[12px] font-bold bg-white
                  hover:bg-green-50 active:scale-[0.97] active:bg-green-100
                  transition-all duration-150 flex items-center justify-center shadow-sm"
              >
                {displayVariants.length > 1 ? "SELECT" : "ADD"}
              </button>
            )}
          </div>
        </div>
      </div>
      {}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">
                  {previewProduct.name}
                </h3>
                <p className="text-sm text-gray-500">Select size</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3">
                {displayVariants.map((variant) => {
                  const variantMrp = parseFloat(variant.mrp || 0);
                  const variantPrice = parseFloat(variant.price || 0);
                  const variantPromo = productPromoMap[variant.id];

                  // Promo-aware pricing for each variant in the modal
                  const vPromoType = variantPromo?.discount_type;
                  const vPromoValue = parseFloat(
                    variantPromo?.discount_value || 0,
                  );
                  let vDisplayPrice = variantPrice;
                  let vStrikePrice = null;
                  let vBadgePct = null;
                  let vFlatAmt = null;
                  if (variantPromo && vPromoValue > 0) {
                    if (vPromoType === "percentage") {
                      const vPromoPrice = parseFloat(
                        (variantPrice * (1 - vPromoValue / 100)).toFixed(2),
                      );
                      vDisplayPrice = vPromoPrice;
                      vStrikePrice = variantPrice;
                      vBadgePct =
                        variantMrp > vPromoPrice
                          ? Math.round(
                              ((variantMrp - vPromoPrice) / variantMrp) * 100,
                            )
                          : Math.round(vPromoValue);
                    } else if (vPromoType === "flat") {
                      vDisplayPrice = parseFloat(
                        Math.max(0, variantPrice - vPromoValue).toFixed(2),
                      );
                      vStrikePrice = variantPrice;
                      vFlatAmt = vPromoValue;
                      if (variantMrp > vDisplayPrice) {
                        vBadgePct = Math.round(
                          ((variantMrp - vDisplayPrice) / variantMrp) * 100,
                        );
                      }
                    }
                  } else if (variantMrp > variantPrice) {
                    vStrikePrice = variantMrp;
                    vBadgePct = Math.round(
                      ((variantMrp - variantPrice) / variantMrp) * 100,
                    );
                  }
                  const variantDiscount = vBadgePct ?? 0;
                  const variantOutOfStock = (variant.stock_quantity ?? 0) <= 0;
                  const cartItem = items.find((i) => i.id === variant.id);
                  const cartQty = cartItem?.quantity ?? 0;
                  return (
                    <div
                      key={variant.id}
                      className={`border rounded-lg p-3 transition-all ${
                        selectedVariantId === variant.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${variantOutOfStock ? "opacity-60" : ""}`}
                      onClick={() =>
                        !variantOutOfStock && setSelectedVariantId(variant.id)
                      }
                    >
                      <div className="flex items-start gap-3">
                        {}
                        <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={variant.image_url}
                            alt={variant.name}
                            className="w-full h-full object-contain"
                            size="sm"
                          />
                        </div>
                        {}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {variant.variant ||
                                  variant.unit_pack_size ||
                                  variant.unit_type ||
                                  "Standard"}
                              </p>
                              {variantPromo && (
                                <span
                                  className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1"
                                  style={{
                                    backgroundColor:
                                      variantPromo.theme_color || "#FF6B00",
                                  }}
                                >
                                  {variantPromo.badge_text || "OFFER"}
                                </span>
                              )}
                              {variantDiscount > 0 && (
                                <span className="inline-block bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1 ml-1">
                                  {variantDiscount}% off
                                </span>
                              )}
                              {vFlatAmt != null && (
                                <span className="inline-block bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1 ml-1">
                                  ₹{vFlatAmt} off
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                ₹{vDisplayPrice.toFixed(2)}
                              </p>
                              {vStrikePrice != null &&
                                vStrikePrice > vDisplayPrice && (
                                  <p className="text-xs text-gray-400 line-through">
                                    ₹{vStrikePrice.toFixed(2)}
                                  </p>
                                )}
                            </div>
                          </div>
                          {}
                          {variantOutOfStock ? (
                            <p className="text-xs text-red-500 mt-1">
                              Out of stock
                            </p>
                          ) : (
                            variant.stock_quantity < 10 && (
                              <p className="text-xs text-orange-500 mt-1">
                                Only {variant.stock_quantity} left
                              </p>
                            )
                          )}
                          {}
                          <div className="mt-2">
                            {cartQty === 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModalAddToCart(variant.id);
                                }}
                                disabled={variantOutOfStock}
                                className="border border-green-600 text-green-700 text-xs font-bold px-4 py-1.5 rounded-lg
                                  hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                ADD TO CART
                              </button>
                            ) : (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 border border-green-500 rounded-lg overflow-hidden w-fit"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQty(variant.id, cartQty - 1);
                                  }}
                                  className="px-3 py-1.5 hover:bg-green-50 text-green-700 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">
                                  {cartQty}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQty(variant.id, cartQty + 1);
                                  }}
                                  disabled={
                                    cartQty >= (variant.stock_quantity ?? 99)
                                  }
                                  className="px-3 py-1.5 hover:bg-green-50 text-green-700 transition-colors disabled:opacity-40"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {}
            <div className="border-t p-4 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default memo(ProductCardWithVariants);

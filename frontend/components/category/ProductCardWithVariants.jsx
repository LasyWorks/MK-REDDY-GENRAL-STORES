"use client";

import { memo, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Minus, X, Package } from "lucide-react";
import ImageWithFallback from "../common/ImageWithFallback";
import CountdownTimer from "../common/CountdownTimer";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";

/**
 * ProductCardWithVariants - Displays a product with variant selector modal
 * @param {Object} props
 * @param {Array} props.variants - Array of product variants (same name/brand, different sizes)
 */
function ProductCardWithVariants({ variants }) {
  const { items, addItem, updateQty } = useCart();
  const { productPromoMap } = usePromotions();
  
  // Filter variants: if any has promotion, show only promoted variants
  const hasAnyPromo = variants.some(v => productPromoMap[v.id]);
  const displayVariants = useMemo(() => {
    if (hasAnyPromo) {
      return variants.filter(v => productPromoMap[v.id]);
    }
    return variants;
  }, [variants, hasAnyPromo, productPromoMap]);

  // Use first display variant as the card preview
  const previewProduct = displayVariants[0];
  
  const [showModal, setShowModal] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const mrp = parseFloat(previewProduct.mrp || 0);
  const price = parseFloat(previewProduct.price || 0);
  const hasDiscount = mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;

  const isOutOfStock = (previewProduct.stock_quantity ?? 0) <= 0;
  const promo = productPromoMap[previewProduct.id] || null;

  const handleCardClick = (e) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleAddClick = (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    
    // If only one variant, add directly
    if (displayVariants.length === 1) {
      addItem(displayVariants[0], 1);
      return;
    }
    
    // Otherwise show modal
    setShowModal(true);
  };

  const handleModalAddToCart = async (variantId) => {
    const variant = displayVariants.find(v => v.id === variantId);
    if (variant && variant.stock_quantity > 0) {
      await addItem(variant, 1);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200 h-full cursor-pointer"
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
              src={previewProduct.image_url}
              alt={previewProduct.name}
              className={`w-full h-full object-contain ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
              size="lg"
            />
          </div>
        </div>

        {/* ── Text + action ── */}
        <div className="flex flex-col flex-1 px-3 pt-3 pb-3 gap-1">
          <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.6rem]">
            {previewProduct.name}
          </h3>

          {/* Show variant count indicator */}
          {displayVariants.length > 1 && (
            <p className="text-xs text-blue-600 font-medium">
              {displayVariants.length} sizes available
            </p>
          )}

          {displayVariants.length === 1 && (
            <p className="text-xs text-gray-400">
              {previewProduct.unit_pack_size || previewProduct.unit_type || "1 unit"}
            </p>
          )}

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
                {displayVariants.length > 1 && (
                  <span className="text-xs text-gray-400 font-normal"> onwards</span>
                )}
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-gray-400 line-through leading-none">
                  ₹{mrp.toFixed(2)}
                </span>
              )}
            </div>

            {/* ADD button */}
            {isOutOfStock ? (
              <span className="text-xs text-red-400 font-medium">Unavailable</span>
            ) : (
              <button
                onClick={handleAddClick}
                className="border border-green-600 text-green-700 text-xs font-bold px-4 py-1.5 rounded-lg
                  hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
              >
                {displayVariants.length > 1 ? "SELECT" : "ADD"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Variant Selector Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">{previewProduct.name}</h3>
                <p className="text-sm text-gray-500">Select size</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Variants List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3">
                {displayVariants.map((variant) => {
                  const variantMrp = parseFloat(variant.mrp || 0);
                  const variantPrice = parseFloat(variant.price || 0);
                  const variantDiscount = variantMrp > variantPrice
                    ? Math.round(((variantMrp - variantPrice) / variantMrp) * 100)
                    : 0;
                  const variantPromo = productPromoMap[variant.id];
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
                      onClick={() => !variantOutOfStock && setSelectedVariantId(variant.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Variant Image */}
                        <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                          <ImageWithFallback
                            src={variant.image_url}
                            alt={variant.name}
                            className="w-full h-full object-contain"
                            size="sm"
                          />
                        </div>

                        {/* Variant Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {variant.variant || variant.unit_pack_size || variant.unit_type || 'Standard'}
                              </p>
                              {variantPromo && (
                                <span
                                  className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1"
                                  style={{ backgroundColor: variantPromo.theme_color || "#FF6B00" }}
                                >
                                  {variantPromo.badge_text || "OFFER"}
                                </span>
                              )}
                              {variantDiscount > 0 && (
                                <span className="inline-block bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1 ml-1">
                                  {variantDiscount}% off
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">₹{variantPrice.toFixed(2)}</p>
                              {variantMrp > variantPrice && (
                                <p className="text-xs text-gray-400 line-through">₹{variantMrp.toFixed(2)}</p>
                              )}
                            </div>
                          </div>

                          {/* Stock status */}
                          {variantOutOfStock ? (
                            <p className="text-xs text-red-500 mt-1">Out of stock</p>
                          ) : variant.stock_quantity < 10 && (
                            <p className="text-xs text-orange-500 mt-1">
                              Only {variant.stock_quantity} left
                            </p>
                          )}

                          {/* Cart actions */}
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
                                  disabled={cartQty >= (variant.stock_quantity ?? 99)}
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

            {/* Modal Footer */}
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

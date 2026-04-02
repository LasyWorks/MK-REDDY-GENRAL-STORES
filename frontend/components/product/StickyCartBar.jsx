"use client";
import { useEffect, useState } from "react";
import {
  ShoppingCartIcon as ShoppingCart,
  PlusIcon as Plus,
  MinusIcon as Minus,
  BoltIcon as Zap,
} from "@heroicons/react/24/outline";
import { useCart } from "@/context/CartContext";
import ImageWithFallback from "@/components/common/ImageWithFallback";

export default function StickyCartBar({ product, sentinelRef, effectivePrice }) {
  const { items, addItem, updateQty, openCart, isCartOpen } = useCart();
  const [visible, setVisible] = useState(false);

  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const price = effectivePrice != null ? effectivePrice : parseFloat(product.price || 0);
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0;
  const imgSrc = product.image_urls?.[0] || product.image_url || null;

  useEffect(() => {
    if (!sentinelRef?.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [sentinelRef]);

  // Always define handlers — no early return before hooks, avoids React 19
  // "Expected static flag was missing" from null→Fragment reconciliation.
  const handleAdd = async () => {
    if (isOutOfStock) return;
    await addItem(product, 1);
    openCart();
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    if (qty === 0) await addItem(product, 1);
    openCart();
  };

  // Use CSS transform to hide so the component always renders the same element
  // type (avoids React 19 reconciler "Expected static flag" error on null→Fragment).
  const hidden = !visible || isCartOpen;

  return (
    <>
      {/* ── Mobile sticky purchase bar ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl md:hidden transition-transform duration-200 ${hidden ? "translate-y-full" : "translate-y-0"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Price summary */}
          <div className="shrink-0">
            <p className="text-[10px] text-gray-400 leading-none">Total</p>
            <p className="text-[18px] font-bold text-gray-900 leading-tight">
              ₹{Math.round(price)}
            </p>
          </div>

          {/* CTA area */}
          <div className="flex-1 flex gap-2.5">
            {isOutOfStock ? (
              <div className="flex-1 h-[48px] flex items-center justify-center bg-gray-200 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
                Out of Stock
              </div>
            ) : qty === 0 ? (
              <>
                <button
                  onClick={handleAdd}
                  className="flex-1 h-[48px] bg-[#16A34A] hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 h-[48px] bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  Buy Now
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center bg-[#16A34A] rounded-xl overflow-hidden h-[48px] flex-1">
                  <button
                    onClick={() => updateQty(product.id, qty - 1)}
                    className="w-12 h-full flex items-center justify-center text-white hover:bg-green-700 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 font-bold text-white text-base text-center select-none">
                    {qty}
                  </span>
                  <button
                    onClick={() => updateQty(product.id, qty + 1)}
                    disabled={qty >= (product.stock_quantity ?? 99)}
                    className="w-12 h-full flex items-center justify-center text-white hover:bg-green-700 transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={openCart}
                  className="flex-1 h-[48px] bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center"
                >
                  View Cart
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop sticky bar (original design) ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl hidden md:block transition-transform duration-200 ${hidden ? "translate-y-full" : "translate-y-0"}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          {/* Thumbnail */}
          {imgSrc && (
            <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-white shrink-0">
              <ImageWithFallback
                src={imgSrc}
                alt={product.name}
                className="w-full h-full object-contain p-0.5"
                size="sm"
                centered
              />
            </div>
          )}

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {product.name}
            </p>
            <p className="text-base font-extrabold text-gray-900">
              ₹{Math.round(price)}
            </p>
          </div>

          {/* CTA */}
          {isOutOfStock ? (
            <div className="px-5 py-2.5 bg-gray-200 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
              Out of Stock
            </div>
          ) : qty === 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
              >
                <Zap className="w-4 h-4" />
                Buy Now
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#16A34A] rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => updateQty(product.id, qty - 1)}
                  className="px-3 py-2.5 hover:bg-green-700 text-white transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold text-white text-base min-w-8 text-center">
                  {qty}
                </span>
                <button
                  onClick={() => updateQty(product.id, qty + 1)}
                  disabled={qty >= (product.stock_quantity ?? 99)}
                  className="px-3 py-2.5 hover:bg-green-700 text-white transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={openCart}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors"
              >
                View Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

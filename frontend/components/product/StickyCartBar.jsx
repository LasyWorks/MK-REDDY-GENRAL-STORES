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

export default function StickyCartBar({ product, sentinelRef }) {
  const { items, addItem, updateQty, openCart, isCartOpen } = useCart();
  const [visible, setVisible] = useState(false);

  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const price = parseFloat(product.price || 0);
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

  // Hide when cart sidebar is open so checkout button is visible
  if (!visible || isCartOpen) return null;

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* Thumbnail (#1) */}
        {imgSrc && (
          <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-white shrink-0 hidden sm:block">
            <ImageWithFallback
              src={imgSrc}
              alt={product.name}
              className="w-full h-full object-contain p-0.5"
              size="sm"
            />
          </div>
        )}

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {product.name}
          </p>
          <p className="text-base font-extrabold text-gray-900">
            ₹{price.toFixed(2)}
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
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 hidden sm:flex"
            >
              <Zap className="w-4 h-4" />
              Buy Now
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Qty stepper */}
            <div className="flex items-center bg-blue-600 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => updateQty(product.id, qty - 1)}
                className="px-3 py-2.5 hover:bg-blue-700 text-white transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-white text-base min-w-8 text-center">
                {qty}
              </span>
              <button
                onClick={() => updateQty(product.id, qty + 1)}
                disabled={qty >= (product.stock_quantity ?? 99)}
                className="px-3 py-2.5 hover:bg-blue-700 text-white transition-colors disabled:opacity-40"
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
  );
}

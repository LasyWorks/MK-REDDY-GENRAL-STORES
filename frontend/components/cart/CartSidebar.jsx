"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, LogIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import secureStorage from "@/lib/secureStorage";
import proxyImg from "@/lib/imgProxy";

export default function CartSidebar() {
  const { items, totalCount, totalPrice, removeItem, updateQty, clearCart, isCartOpen, closeCart } =
    useCart();

  const overlayRef = useRef(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();
  const loginHref = `/login?redirect=${encodeURIComponent(pathname || "/")}`;

  // Sync logged-in state from localStorage (client-side only)
  useEffect(() => {
    setLoggedIn(!!secureStorage.getItem("token"));
  }, [isCartOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">
              My Cart{" "}
              {totalCount > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({totalCount} item{totalCount > 1 ? "s" : ""})
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                aria-label="Clear all items"
              >
                Clear all
              </button>
            )}
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            !loggedIn ? (
              /* ── Not signed in ── */
              <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
                  <LogIn className="w-9 h-9 text-green-500" />
                </div>
                <p className="text-gray-800 font-semibold text-base">Sign in to your account</p>
                <p className="text-sm text-gray-400 mt-1.5 leading-snug">
                  Sign in to add items to your cart and place orders
                </p>
                <Link
                  href={loginHref}
                  onClick={closeCart}
                  className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  href={loginHref}
                  onClick={closeCart}
                  className="mt-3 text-sm text-green-600 hover:underline font-medium"
                >
                  New here? Create an account
                </Link>
              </div>
            ) : (
              /* ── Signed in but cart empty ── */
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">Your cart is empty</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add items to get started
                </p>
                <button
                  onClick={closeCart}
                  className="mt-6 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )
          ) : (
            items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={removeItem}
                onUpdateQty={updateQty}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50">
            {/* Savings banner */}
            {items.some((i) => i.mrp > i.price) && (
              <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-700 font-medium text-center">
                🎉 You save ₹
                {items
                  .reduce((s, i) => s + (i.mrp - i.price) * i.quantity, 0)
                  .toFixed(0)}{" "}
                on this order!
              </div>
            )}

            {/* Subtotal */}
            <div className="flex items-center justify-between text-gray-600 text-sm">
              <span>
                Subtotal ({totalCount} item{totalCount > 1 ? "s" : ""})
              </span>
              <span className="font-semibold text-gray-900">
                ₹{totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Checkout CTA */}
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex items-center justify-center w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-base shadow-md"
            >
              Proceed to Checkout →
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
}

// ── Single cart item row ──────────────────────────────────────────────
function CartItem({ item, onRemove, onUpdateQty }) {
  return (
    <div className="flex gap-3 bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
        {item.image_url ? (
          <img
            src={proxyImg(item.image_url)}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🛒
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {item.name}
        </p>
        {item.unit_pack_size && (
          <p className="text-xs text-gray-400 mt-0.5">{item.unit_pack_size}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {/* Qty controls */}
          <div className="flex items-center gap-1.5 border border-green-500 rounded-lg overflow-hidden">
            <button
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
              className="px-2 py-1 hover:bg-green-50 text-green-700 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
              disabled={item.quantity >= (item.stock_quantity ?? 99)}
              className="px-2 py-1 hover:bg-green-50 text-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Line total + remove */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              ₹{(item.price * item.quantity).toFixed(2)}
            </span>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

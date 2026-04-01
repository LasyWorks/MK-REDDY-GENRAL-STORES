"use client";
import { useEffect, useRef } from "react";
import {
  XMarkIcon as X,
  TrashIcon as Trash2,
  PlusIcon as Plus,
  MinusIcon as Minus,
  ShoppingBagIcon as ShoppingBag,
  ArrowRightStartOnRectangleIcon as LogIn,
  TagIcon,
  ShoppingCartIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  DocumentTextIcon,
  TruckIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
import secureStorage from "@/lib/secureStorage";
import proxyImg from "@/lib/imgProxy";
import api from "@/lib/api";

export default function CartSidebar() {
  const {
    items,
    totalCount,
    totalPrice,
    removeItem,
    updateQty,
    clearCart,
    isCartOpen,
    closeCart,
  } = useCart();
  const overlayRef = useRef(null);
  const loggedIn = !!secureStorage.getItem("token");
  const pathname = usePathname();
  const loginHref = `/login?redirect=${encodeURIComponent(pathname || "/")}`;
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  const { productPromoMap, activePromos, storeSettings } = usePromotions();
  const { min_order_amount: minOrderAmount, delivery_charge: deliveryCharge, handling_charge: handlingCharge } = storeSettings;

  const totalMRP = items.reduce((s, i) => s + i.mrp * i.quantity, 0);
  const totalSavings = totalMRP - totalPrice;
  const hasSavings = totalSavings > 0.01;

  // Calculate promotion discount (mirrors checkout page logic)
  let promoDiscount = 0;
  let promoLabel = null;
  (() => {
    if (!productPromoMap || !Object.keys(productPromoMap).length) return;
    const promoTotals = {};
    for (const item of items) {
      const p = productPromoMap[item.id];
      if (!p) continue;
      const key = p.promotion_id;
      if (!promoTotals[key]) {
        promoTotals[key] = {
          title: p.title,
          discount_type: p.discount_type,
          discount_value: parseFloat(p.discount_value),
          qualifyingTotal: 0,
          productCount: 0,
        };
      }
      promoTotals[key].qualifyingTotal += item.price * item.quantity;
      promoTotals[key].productCount += 1;
    }
    for (const info of Object.values(promoTotals)) {
      if (info.discount_type === "threshold") continue;
      let d = 0;
      if (info.discount_type === "flat") {
        d = Math.min(info.discount_value * info.productCount, info.qualifyingTotal);
      } else {
        d = parseFloat(((info.qualifyingTotal * info.discount_value) / 100).toFixed(2));
        d = Math.min(d, info.qualifyingTotal);
      }
      if (d > promoDiscount) {
        promoDiscount = parseFloat(d.toFixed(2));
        promoLabel = info.title;
      }
    }
    if (activePromos?.length) {
      for (const promo of activePromos) {
        if (promo.discount_type !== "threshold") continue;
        const minAmt = parseFloat(promo.min_order_amount || 0);
        if (minAmt <= 0 || totalPrice < minAmt) continue;
        let d = 0;
        if (promo.reward_type === "cash_off") {
          d = Math.min(parseFloat(promo.discount_value || 0), totalPrice);
        } else if (promo.reward_type === "percentage") {
          d = parseFloat(((totalPrice * parseFloat(promo.discount_value || 0)) / 100).toFixed(2));
          d = Math.min(d, totalPrice);
        }
        if (d > promoDiscount) {
          promoDiscount = parseFloat(d.toFixed(2));
          promoLabel = promo.title;
        }
      }
    }
  })();

  const grandTotal = Math.max(totalPrice - promoDiscount + deliveryCharge + handlingCharge, 0);
  const totalAllSavings = totalSavings + promoDiscount;
  const belowMin = items.length > 0 && minOrderAmount > 0 && totalPrice < minOrderAmount;
  const amountNeeded = minOrderAmount - totalPrice;

  if (!isCartOpen) return null;
  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 z-[55] backdrop-blur-[1px]"
        onClick={closeCart}
      />
      <div className="fixed right-0 top-0 h-[100dvh] w-full max-w-md bg-gray-50 z-[60] flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={closeCart}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close cart"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">My Cart</h2>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-600 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              aria-label="Clear all items"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-2">
          {items.length === 0 ? (
            !loggedIn ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
                  <LogIn className="w-9 h-9 text-green-500" />
                </div>
                <p className="text-gray-800 font-semibold text-base">
                  Sign in to your account
                </p>
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
            <>
              {/* Shipment info */}
              <div className="bg-white mx-3 mt-3 rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                  <TruckIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Shipment of {totalCount} item{totalCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    Order will be confirmed by the store
                  </p>
                </div>
              </div>

              {/* Cart items */}
              <div className="bg-white mx-3 mt-3 rounded-xl border border-gray-100 divide-y divide-gray-50">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onUpdateQty={updateQty}
                  />
                ))}
              </div>

              {/* Bill details */}
              <div className="bg-white mx-3 mt-3 mb-3 rounded-xl border border-gray-100 px-4 py-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                  Bill details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Items total</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      {hasSavings && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{totalMRP.toFixed(2)}
                        </span>
                      )}
                      ₹{totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <TagIcon className="w-3.5 h-3.5" />
                        {promoLabel || "Promo discount"}
                      </span>
                      <span className="font-semibold">−₹{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1">
                      <TruckIcon className="w-3.5 h-3.5" />
                      Delivery charge
                    </span>
                    {deliveryCharge === 0 ? (
                      <span className="text-green-600 font-semibold">FREE</span>
                    ) : (
                      <span className="font-medium text-gray-900">
                        ₹{deliveryCharge}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Handling charge
                    </span>
                    {handlingCharge === 0 ? (
                      <span className="text-green-600 font-semibold">FREE</span>
                    ) : (
                      <span className="font-medium text-gray-900">
                        ₹{handlingCharge}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-dashed border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                    <span>Grand total</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Savings badge */}
              {(hasSavings || promoDiscount > 0) && (
                <div className="mx-3 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium text-center flex items-center justify-center gap-1.5">
                  <TagIcon className="w-4 h-4 shrink-0" />
                  You save ₹{totalAllSavings.toFixed(0)} on this order!
                </div>
              )}

              {/* Cancellation policy */}
              <div className="mx-3 mb-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Order Policy
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Orders once confirmed cannot be cancelled. In case of any
                  issues, contact the store for assistance.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Sticky checkout bar */}
        {items.length > 0 && (
          <div
            className="bg-white border-t border-gray-100 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.10)] px-4 pt-4 pb-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {/* Grand total row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Grand Total</p>
                <p className="text-xl font-extrabold text-gray-900">₹{grandTotal.toFixed(2)}</p>
              </div>
              {(hasSavings || promoDiscount > 0) && (
                <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-100">
                  <TagIcon className="w-3.5 h-3.5" />
                  Save ₹{totalAllSavings.toFixed(0)}
                </div>
              )}
            </div>

            {/* Min-order notice */}
            {belowMin && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 text-xs text-amber-700 font-medium">
                <CurrencyRupeeIcon className="w-4 h-4 flex-shrink-0 text-amber-500" />
                Add ₹{amountNeeded.toFixed(0)} more to place order (min ₹{minOrderAmount})
              </div>
            )}

            {/* CTA button */}
            {belowMin ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-bold text-base rounded-xl py-3.5 cursor-not-allowed select-none"
              >
                Proceed to Checkout
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            ) : (
              <Link
                href={loggedIn ? "/checkout" : loginHref}
                onClick={closeCart}
                className="w-full flex items-center justify-center gap-2 bg-green-600 active:bg-green-700 text-white font-bold text-base rounded-xl py-3.5 transition-colors shadow-sm select-none"
              >
                {loggedIn ? "Proceed to Checkout" : "Login to Proceed"}
                <ChevronRightIcon className="w-5 h-5" />
              </Link>
            )}
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
}

function CartItem({ item, onRemove, onUpdateQty }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Image */}
      <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
        {item.image_url ? (
          <img
            src={proxyImg(item.image_url)}
            alt={item.name}
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartIcon className="w-6 h-6 text-gray-300" />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {item.name}
        </p>
        {item.unit_pack_size && (
          <p className="text-xs text-gray-400 mt-0.5">{item.unit_pack_size}</p>
        )}
        <p className="text-sm font-bold text-gray-900 mt-1">
          ₹{item.price.toFixed(0)}
          {item.mrp > item.price && (
            <span className="text-xs text-gray-400 line-through ml-1 font-normal">
              ₹{item.mrp.toFixed(0)}
            </span>
          )}
        </p>
      </div>
      {/* Quantity + delete */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="flex items-center bg-green-600 rounded-lg overflow-hidden">
          <button
            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            className="px-2.5 py-1.5 text-white hover:bg-green-700 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold text-white min-w-[24px] text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            disabled={item.quantity >= (item.stock_quantity ?? 99)}
            className="px-2.5 py-1.5 text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-0.5 rounded text-gray-300 hover:text-red-500 transition-colors"
          aria-label="Remove item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

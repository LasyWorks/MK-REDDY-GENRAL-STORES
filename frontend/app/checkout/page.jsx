"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
import orderService from "@/services/orderService";
import cartService from "@/services/cartService";
import authService from "@/services/authService";
import proxyImg from "@/lib/imgProxy";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, totalCount, clearCartLocal } = useCart();
  const { productPromoMap, activePromos } = usePromotions();

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // { orderId, orderNumber }

  // Auth guard
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }
    setUser(authService.getCurrentUser());
    setAuthChecked(true);
  }, [router]);

  // Redirect if cart becomes empty after auth check (but not after placing order)
  useEffect(() => {
    if (authChecked && items.length === 0 && !success) {
      router.replace("/");
    }
  }, [authChecked, items.length, success, router]);

  const totalMRP = items.reduce((s, i) => s + i.mrp * i.quantity, 0);
  const totalSavings = totalMRP - totalPrice;
  const hasSavings = totalSavings > 0.01;

  // ── Promotion discount calculation ──────────────────────────────
  let promoDiscount = 0;
  let promoLabel = null;
  (() => {
    if (!productPromoMap || !Object.keys(productPromoMap).length) return;
    // Group qualifying items by promotion
    const promoTotals = {};
    for (const item of items) {
      const p = productPromoMap[item.id];
      if (!p) continue;
      const key = p.promotion_id;
      if (!promoTotals[key]) {
        promoTotals[key] = { title: p.title, discount_type: p.discount_type, discount_value: parseFloat(p.discount_value), qualifyingTotal: 0 };
      }
      promoTotals[key].qualifyingTotal += item.price * item.quantity;
    }
    // Pick best
    for (const info of Object.values(promoTotals)) {
      let d = 0;
      if (info.discount_type === 'flat') {
        d = Math.min(info.discount_value, info.qualifyingTotal);
      } else {
        d = parseFloat(((info.qualifyingTotal * info.discount_value) / 100).toFixed(2));
        d = Math.min(d, info.qualifyingTotal);
      }
      if (d > promoDiscount) {
        promoDiscount = parseFloat(d.toFixed(2));
        promoLabel = info.title;
      }
    }
  })();
  const finalTotal = Math.max(totalPrice - promoDiscount, 0);
  const totalAllSavings = totalSavings + promoDiscount;

  const handlePlaceOrder = async () => {
    setError(null);
    setPlacing(true);
    try {
      // Sync the full local cart → backend so the order has all items
      const mapped = items.map((i) => ({ product_id: i.id, quantity: i.quantity }));
      if (mapped.length > 0) {
        await cartService.syncAll(mapped);
      }

      const res = await orderService.create({ notes: notes.trim() || undefined });
      const order = res.data;
      // Set success FIRST so the empty-cart redirect guard doesn't fire
      setSuccess({ orderId: order.id, orderNumber: order.order_number });
      // Use local-only clear — backend already cleared the cart in the order transaction
      clearCartLocal();
    } catch (e) {
      setError(e.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────
  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h2>
          <p className="text-gray-500 text-sm mb-1">
            Your order has been confirmed.
          </p>
          {success.orderNumber && (
            <p className="text-xs text-gray-400 mb-6">
              Order #{success.orderNumber}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/orders/${success.orderId}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              <Package className="w-4 h-4" />
              Track Order
            </Link>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Loading / redirecting ───────────────────────────────────────────
  if (!authChecked || items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </main>
    );
  }

  // ── Main checkout ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: items + notes ────────────────────────────────── */}
          <div className="flex-1 space-y-4">

            {/* Delivery info banner */}
            {user && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">Pickup / Delivery Info</span>
                </div>
                <p className="text-sm text-gray-500">
                  Ordering as{" "}
                  <span className="font-medium text-gray-700">{user.name || user.phone}</span>
                  {user.phone && user.name && (
                    <span className="text-gray-400"> · {user.phone}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  The store will confirm your order and prepare it for pickup / delivery.
                </p>
              </div>
            )}

            {/* Cart items list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                <ShoppingBag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">
                  Your Items ({totalCount})
                </span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 px-4 py-3.5">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={proxyImg(item.image_url)}
                        alt={item.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🛒</div>
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
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-500">
                        ₹{item.price.toFixed(0)} × {item.quantity}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Order Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Any special instructions for the store? (e.g. preferred brand, substitution notes…)"
                className="w-full text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{notes.length}/500</p>
            </div>
          </div>

          {/* ── Right: price summary ───────────────────────────────── */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-5 sticky top-20 space-y-4">
              <h2 className="text-base font-bold text-gray-900">Order Summary</h2>

              {/* Line items */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal ({totalCount} item{totalCount > 1 ? "s" : ""})</span>
                  <span className="font-medium text-gray-900">₹{totalPrice.toFixed(2)}</span>
                </div>
                {hasSavings && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Your Savings
                    </span>
                    <span className="font-semibold">−₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {promoLabel || "Promo Discount"}
                    </span>
                    <span className="font-semibold">−₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Delivery</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-extrabold text-gray-900">
                  ₹{finalTotal.toFixed(2)}
                </span>
              </div>

              {/* Savings banner */}
              {totalAllSavings > 0.01 && (
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 font-medium text-center">
                  🎉 You&apos;re saving ₹{totalAllSavings.toFixed(0)} on this order!
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Place order */}
              <button
                onClick={handlePlaceOrder}
                disabled={placing || items.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-sm text-base"
              >
                {placing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Order…
                  </>
                ) : (
                  <>
                    Place Order
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                By placing the order you agree to our store&apos;s terms.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

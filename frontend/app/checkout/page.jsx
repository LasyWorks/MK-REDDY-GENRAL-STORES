"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBagIcon as ShoppingBag,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  CubeIcon as Package,
  TagIcon as Tag,
  DocumentTextIcon as FileText,
  CheckCircleIcon as CheckCircle2,
  ArrowPathIcon as Loader2,
  ExclamationCircleIcon as AlertCircle,
  ArrowRightOnRectangleIcon as LogIn,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "@/context/CartContext";
import { usePromotions } from "@/context/PromotionContext";
import orderService from "@/services/orderService";
import cartService from "@/services/cartService";
import authService from "@/services/authService";
import proxyImg from "@/lib/imgProxy";
import api from "@/lib/api";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withMinimumDelay(task, minMs) {
  const startedAt = Date.now();
  const result = await task();
  const elapsed = Date.now() - startedAt;
  if (elapsed < minMs) {
    await wait(minMs - elapsed);
  }
  return result;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, totalCount, clearCartLocal } = useCart();
  const { productPromoMap, activePromos } = usePromotions();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placingStep, setPlacingStep] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [storeSettings, setStoreSettings] = useState({
    min_order_amount: 0,
    delivery_charge: 0,
    handling_charge: 0,
  });
  useEffect(() => {
    // Redirect to login if not authenticated - checkout requires account
    if (!authService.isAuthenticated()) {
      router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }
    setUser(authService.getCurrentUser());
    setAuthChecked(true);
    // Fetch store settings for charges
    api.get("/settings/public").then((res) => {
      if (res.data) setStoreSettings(res.data);
    }).catch(() => {});
  }, [router]);
  useEffect(() => {
    // Redirect to home if cart is empty (nothing to checkout)
    if (authChecked && items.length === 0 && !success) {
      router.replace("/");
    }
  }, [authChecked, items.length, success, router]);
  useEffect(() => {
    if (!success) {
      setSuccessVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => {
      setSuccessVisible(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [success]);
  const totalMRP = items.reduce((s, i) => s + i.mrp * i.quantity, 0);
  const totalSavings = totalMRP - totalPrice;
  const hasSavings = totalSavings > 0.01;
  let promoDiscount = 0;
  let promoLabel = null;
  // Calculate best promotion discount client-side for instant preview (server validates)
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
      let d = 0;
      // Threshold promos are handled separately below — skip them here
      if (info.discount_type === "threshold") continue;
      if (info.discount_type === "flat") {
        // ₹X off per qualifying product (not per unit, not per order)
        d = Math.min(info.discount_value * info.productCount, info.qualifyingTotal);
      } else {
        // Percentage discount - capped at item total to prevent negative prices
        d = parseFloat(
          ((info.qualifyingTotal * info.discount_value) / 100).toFixed(2),
        );
        d = Math.min(d, info.qualifyingTotal);
      }
      // Use best promotion for customer (highest discount)
      if (d > promoDiscount) {
        promoDiscount = parseFloat(d.toFixed(2));
        promoLabel = info.title;
      }
    }
  })();

  // Threshold promo progress bar: nearest locked threshold, or unlocked reward
  let thresholdBar = null;
  let unlockedThreshold = null;
  if (activePromos?.length) {
    const rawTotal = totalPrice;
    for (const promo of activePromos) {
      if (promo.discount_type !== "threshold") continue;
      const minAmt = parseFloat(promo.min_order_amount || 0);
      if (minAmt <= 0) continue; // not properly configured — skip
      if (rawTotal >= minAmt) {
        // Threshold MET — calculate the discount and credit it to promoDiscount preview
        let d = 0;
        if (promo.reward_type === "cash_off") {
          // Flat ₹ cash off the cart
          d = Math.min(parseFloat(promo.discount_value || 0), rawTotal);
        } else if (promo.reward_type === "percentage") {
          // Percentage off cart subtotal
          d = parseFloat(
            ((rawTotal * parseFloat(promo.discount_value || 0)) / 100).toFixed(2)
          );
          d = Math.min(d, rawTotal);
        } else if (promo.reward_type === "free_item") {
          d = 0; // no monetary discount
        } else {
          // Legacy fallback — treat as flat ₹
          d = Math.min(parseFloat(promo.discount_value || 0), rawTotal);
        }
        if (d > promoDiscount) {
          promoDiscount = parseFloat(d.toFixed(2));
          promoLabel = promo.title;
        }
        if (!unlockedThreshold) {
          const freeItemName = promo.free_product_name
            ? `${promo.free_product_name}${promo.free_product_variant ? ` (${promo.free_product_variant})` : ""}`
            : null;
          const reward =
            promo.reward_type === "free_item"
              ? freeItemName ? `🎁 Free: ${freeItemName}` : "🎁 Free item unlocked!"
              : `₹${d.toFixed(2)} off applied!`;
          unlockedThreshold = {
            title: promo.title,
            reward,
            freeItemName,
            freeItemImage: promo.free_product_image || null,
            isFreeItem: promo.reward_type === "free_item",
          };
        }
      } else if (!thresholdBar) {
        const amountNeeded = minAmt - rawTotal;
        const pct = Math.min(Math.round((rawTotal / minAmt) * 100), 99);
        const reward =
          promo.reward_type === "free_item"
            ? "a free item"
            : promo.reward_type === "flat"
            ? `₹${parseFloat(promo.discount_value || 0)} off`
            : `${parseFloat(promo.discount_value || 0)}% off`;
        thresholdBar = { title: promo.title, minAmt, amountNeeded, pct, reward };
      }
    }
  }

  const finalTotal = Math.max(totalPrice - promoDiscount + storeSettings.delivery_charge + storeSettings.handling_charge, 0);
  const totalAllSavings = totalSavings + promoDiscount;
  const handlePlaceOrder = async () => {
    setError(null);
    setPlacing(true);
    setPlacingStep(1);
    try {
      const mapped = items.map((i) => ({
        product_id: i.id,
        quantity: i.quantity,
      }));
      await withMinimumDelay(async () => {
        if (mapped.length > 0) {
          await cartService.syncAll(mapped);
        }
      }, 900);

      setPlacingStep(2);
      const res = await withMinimumDelay(
        () => orderService.create({
          notes: notes.trim() || undefined,
        }),
        1200,
      );

      setPlacingStep(3);
      const order = res.data;
      await wait(900);
      setPlacingStep(4);
      await wait(1200);
      setSuccessVisible(false);
      setSuccess({ orderId: order.id, orderNumber: order.order_number });
      clearCartLocal();
    } catch (e) {
      setError(e.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
      setPlacingStep(0);
    }
  };
  const PLACING_STEPS = [
    { label: "Syncing your cart", icon: ShoppingBag },
    { label: "Placing your order", icon: Package },
    { label: "Confirming", icon: CheckCircle2 },
  ];

  if (placing) {
    const overlayComplete = placingStep > PLACING_STEPS.length;
    const activeStep = overlayComplete
      ? PLACING_STEPS[PLACING_STEPS.length - 1]
      : PLACING_STEPS[Math.max(placingStep - 1, 0)] || PLACING_STEPS[0];
    const ActiveStepIcon = activeStep.icon;
    const progressWidth = overlayComplete
      ? "100%"
      : `${Math.max((placingStep / PLACING_STEPS.length) * 100, 12)}%`;

    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
            {overlayComplete ? (
              <div className="absolute inset-0 rounded-full border-4 border-green-500" />
            ) : (
              <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              {overlayComplete ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <ActiveStepIcon className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {overlayComplete ? "Order Confirmed" : "Processing Order"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {overlayComplete
              ? "Everything is ready. Opening your order confirmation."
              : "Please wait while we place your order"}
          </p>
          <div className="mb-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-700 ease-out"
                style={{ width: progressWidth }}
              />
            </div>
          </div>
          <div className="space-y-3 text-left">
            {PLACING_STEPS.map((s, i) => {
              const stepNum = i + 1;
              const done = placingStep > stepNum;
              const active = placingStep === stepNum;
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                    active
                      ? "bg-green-50 border border-green-200"
                      : done
                      ? "bg-gray-50 border border-gray-100"
                      : "border border-transparent opacity-40"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      done
                        ? "bg-green-500"
                        : active
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      done
                        ? "text-green-700"
                        : active
                        ? "text-green-700"
                        : "text-gray-400"
                    }`}
                  >
                    {s.label}
                    {done && (
                      <span className="text-green-500 text-xs ml-1.5">Done</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-5">Do not close this page</p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div
          className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center transition-all duration-500 ease-out ${
            successVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-4 scale-95"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 transition-all duration-500 delay-75 ${
              successVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
          >
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2
            className={`text-2xl font-bold text-gray-900 mb-1 transition-all duration-500 delay-100 ${
              successVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            Order Placed!
          </h2>
          <p
            className={`text-gray-500 text-sm mb-1 transition-all duration-500 delay-150 ${
              successVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            Your order has been confirmed.
          </p>
          {success.orderNumber && (
            <p
              className={`text-xs text-gray-400 mb-6 transition-all duration-500 delay-200 ${
                successVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              Order #{success.orderNumber}
            </p>
          )}
          <div
            className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 delay-300 ${
              successVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
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
  if (!authChecked || items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
        <div className="flex flex-col lg:flex-row gap-6">
          {}
          <div className="flex-1 space-y-4">
            {}
            {user && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    Pickup / Delivery Info
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Ordering as{" "}
                  <span className="font-medium text-gray-700">
                    {user.name || user.phone}
                  </span>
                  {user.phone && user.name && (
                    <span className="text-gray-400"> · {user.phone}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  The store will confirm your order and prepare it for pickup /
                  delivery.
                </p>
              </div>
            )}
            {}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                <ShoppingBag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">
                  Your Items ({totalCount}{unlockedThreshold?.isFreeItem && unlockedThreshold.freeItemName ? " + 1 free" : ""})
                </span>
              </div>
              {unlockedThreshold?.isFreeItem && unlockedThreshold.freeItemName && (
                <div className="flex gap-3 px-4 py-3.5 bg-green-50 border-b border-green-100">
                  <div className="w-14 h-14 rounded-lg bg-white border border-green-200 flex-shrink-0 overflow-hidden">
                    {unlockedThreshold.freeItemImage ? (
                      <img src={proxyImg(unlockedThreshold.freeItemImage)} alt="Free item" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🎁</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 line-clamp-2 leading-snug">{unlockedThreshold.freeItemName}</p>
                    <p className="text-xs text-green-600 mt-0.5">{unlockedThreshold.title}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-green-600 font-semibold">FREE</span>
                      <span className="text-sm font-bold text-green-700">₹0.00</span>
                    </div>
                  </div>
                </div>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 px-4 py-3.5">
                  {}
                  <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={proxyImg(item.image_url)}
                        alt={item.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCartIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  {}
                  {(() => {
                    const iPromo = productPromoMap?.[item.id];
                    const iPromoAmt = iPromo && iPromo.discount_value
                      ? iPromo.discount_type === "percentage"
                        ? parseFloat(((item.price * parseFloat(iPromo.discount_value)) / 100).toFixed(2))
                        : Math.min(parseFloat(iPromo.discount_value), item.price)
                      : 0;
                    const iPromoPrice = iPromoAmt > 0 ? item.price - iPromoAmt : null;
                    return (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                      {item.name}
                    </p>
                    {item.unit_pack_size && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.unit_pack_size}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      {iPromoPrice != null ? (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="line-through text-gray-400">&#x20b9;{item.price.toFixed(0)}</span>
                          <span className="font-semibold text-gray-700">&#x20b9;{iPromoPrice.toFixed(0)}</span>
                          <span> &times; {item.quantity}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          &#x20b9;{item.price.toFixed(0)} &times; {item.quantity}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-900">
                        &#x20b9;{iPromoPrice != null
                          ? (iPromoPrice * item.quantity).toFixed(2)
                          : (item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                    );
                  })()}
                </div>
              ))}
            </div>
            {}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Order Notes{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Any special instructions for the store? (e.g. preferred brand, substitution notes…)"
                className="w-full text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {notes.length}/500
              </p>
            </div>
          </div>
          {}
          <div className="lg:w-80 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-5 sticky top-20 space-y-4">
              <h2 className="text-base font-bold text-gray-900">
                Order Summary
              </h2>
              {/* Threshold promo: unlocked reward banner */}
              {unlockedThreshold && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
                  <p className="text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {unlockedThreshold.reward}
                  </p>
                  <p className="text-green-500 text-[10px]">{unlockedThreshold.title}</p>
                </div>
              )}
              {/* Threshold promo progress bar */}
              {thresholdBar && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs space-y-1.5">
                  <p className="text-orange-700 font-semibold">
                    Add ₹{thresholdBar.amountNeeded.toFixed(2)} more to get {thresholdBar.reward}!
                  </p>
                  <div className="w-full bg-orange-100 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${thresholdBar.pct}%` }}
                    />
                  </div>
                  <p className="text-orange-500 text-[10px]">{thresholdBar.pct}% of the way — {thresholdBar.title}</p>
                </div>
              )}
              {}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>
                    MRP Total ({totalCount} item{totalCount > 1 ? "s" : ""})
                  </span>
                  <span className="font-medium text-gray-900">
                    ₹{totalMRP.toFixed(2)}
                  </span>
                </div>
                {hasSavings && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Your Savings
                    </span>
                    <span className="font-semibold">
                      −₹{totalSavings.toFixed(2)}
                    </span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {promoLabel || "Promo Discount"}
                    </span>
                    <span className="font-semibold">
                      −₹{promoDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Delivery</span>
                  {storeSettings.delivery_charge === 0 ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <span className="font-medium text-gray-900">₹{storeSettings.delivery_charge.toFixed(2)}</span>
                  )}
                </div>
                {storeSettings.handling_charge > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Handling charge</span>
                    <span className="font-medium text-gray-900">₹{storeSettings.handling_charge.toFixed(2)}</span>
                  </div>
                )}
              </div>
              {}
              <div className="border-t border-gray-100" />
              {}
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-extrabold text-gray-900">
                  ₹{finalTotal.toFixed(2)}
                </span>
              </div>
              {}
              {totalAllSavings > 0.01 && (
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700 font-medium text-center flex items-center justify-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  You&apos;re saving ₹{totalAllSavings.toFixed(0)} on this
                  order!
                </div>
              )}
              {}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {}
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

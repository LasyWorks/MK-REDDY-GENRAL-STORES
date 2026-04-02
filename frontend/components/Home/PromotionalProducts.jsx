"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  PlusIcon as Plus,
  MinusIcon as Minus,
  SparklesIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import ImageWithFallback from "@/components/common/ImageWithFallback";
import { useLanguage } from "@/context/LanguageContext";
import { usePromotions } from "@/context/PromotionContext";
import { useCart } from "@/context/CartContext";
import { groupProductsByVariant } from "@/lib/productGrouping";
import secureStorage from "@/lib/secureStorage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

/* ─────────── Decorative SVGs ─────────── */
function SparklesSvg({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="30" cy="5" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="5" cy="30" r="2" fill="currentColor" opacity="0.4" />
      <path
        d="M60 0 L63 8 L72 8 L65 13 L68 21 L60 16 L52 21 L55 13 L48 8 L57 8 Z"
        fill="currentColor"
        opacity="0.5"
      />
      <path
        d="M100 40 L102 46 L108 46 L103 50 L105 56 L100 52 L95 56 L97 50 L92 46 L98 46 Z"
        fill="currentColor"
        opacity="0.4"
      />
      <circle cx="110" cy="15" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="85" cy="90" r="2" fill="currentColor" opacity="0.5" />
      <path
        d="M20 80 L22 86 L28 86 L23 90 L25 96 L20 92 L15 96 L17 90 L12 86 L18 86 Z"
        fill="currentColor"
        opacity="0.4"
      />
      <circle cx="50" cy="110" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="90" cy="105" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function DiyaSvg({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="40" cy="18" rx="5" ry="10" fill="#FCD34D" opacity="0.9" />
      <ellipse cx="40" cy="20" rx="3" ry="7" fill="#F97316" opacity="0.85" />
      <rect
        x="39"
        y="26"
        width="2"
        height="6"
        rx="1"
        fill="#92400E"
        opacity="0.6"
      />
      <path
        d="M20 38 Q20 58 40 60 Q60 58 60 38 Z"
        fill="#F59E0B"
        opacity="0.7"
      />
      <path
        d="M18 38 Q40 44 62 38 Q60 32 40 30 Q20 32 18 38 Z"
        fill="#FBBF24"
        opacity="0.8"
      />
      <ellipse cx="40" cy="18" rx="10" ry="12" fill="#FDE68A" opacity="0.15" />
    </svg>
  );
}

/* ─────────── Live HH:MM:SS Countdown ─────────── */
function LiveCountdown({ endsAt }) {
  const calc = () => {
    const diff = Math.max(0, new Date(endsAt) - new Date());
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      expired: diff <= 0,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => {
      const t = calc();
      setTime(t);
      if (t.expired) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (time.expired) return null;

  const blocks = [
    { val: String(time.h).padStart(2, "0"), label: "HRS" },
    { val: String(time.m).padStart(2, "0"), label: "MIN" },
    { val: String(time.s).padStart(2, "0"), label: "SEC" },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-white/70 text-xs font-semibold mr-1 hidden sm:inline">
        Ends in
      </span>
      {blocks.map((b, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <span className="bg-white/20 backdrop-blur-sm text-white font-mono font-extrabold text-base sm:text-xl leading-none px-2.5 py-1.5 rounded-lg min-w-10.5 text-center tabular-nums border border-white/30 shadow-inner">
              {b.val}
            </span>
            <span className="text-white/60 text-[9px] font-bold mt-0.5 tracking-widest">
              {b.label}
            </span>
          </div>
          {i < 2 && (
            <span className="text-white font-extrabold text-xl leading-none mb-4 opacity-70">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────── Festive Product Card ─────────── */
function FestiveProductCard({ product, themeColor }) {
  const mrp = parseFloat(product.mrp || 0);
  const price = parseFloat(product.price || 0);
  const stock = product.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 8;

  const { items, addItem, updateQty } = useCart();
  const { productPromoMap } = usePromotions();
  const promo = productPromoMap[product.id] || null;

  // ── Limited-deal progress ─────────────────────────────────────────────────
  // deal_limit  = max orders that can get the discount (null = unlimited)
  // item_limit  = max total units that can be sold at promo price (null = unlimited)
  const dealLimit    = promo?.deal_limit    != null ? parseInt(promo.deal_limit, 10)    : null;
  const dealsClaimed = promo?.deals_claimed != null ? parseInt(promo.deals_claimed, 10) : 0;
  const itemLimit    = promo?.item_limit    != null ? parseInt(promo.item_limit, 10)    : null;
  const itemsClaimed = promo?.items_claimed != null ? parseInt(promo.items_claimed, 10) : 0;

  const dealOrderExhausted = dealLimit !== null && dealsClaimed >= dealLimit;
  const dealItemExhausted  = itemLimit !== null && itemsClaimed >= itemLimit;
  const dealExhausted      = dealOrderExhausted || dealItemExhausted;

  const dealsRemaining = dealLimit !== null ? Math.max(0, dealLimit - dealsClaimed) : null;
  const itemsRemaining = itemLimit !== null ? Math.max(0, itemLimit - itemsClaimed) : null;
  const dealPct        = dealLimit  ? Math.round((dealsRemaining / dealLimit)  * 100) : null;
  const itemPct        = itemLimit  ? Math.round((itemsRemaining  / itemLimit)  * 100) : null;
  // ─────────────────────────────────────────────────────────────────────────

  // ── Promo-aware price calculation ──────────────────────────────────────────
  const promoType  = !dealExhausted && promo ? promo.discount_type  : null;
  const promoValue = !dealExhausted && promo ? parseFloat(promo.discount_value || 0) : 0;

  let displayPrice = price;   // price actually shown to customer
  let strikePrice  = null;    // price shown crossed-out (null = hide)
  let badgePercent = null;    // %OFF badge value (null = hide)
  let flatBadgeAmt = null;    // flat ₹X off badge value (null = hide)

  if (!dealExhausted && promo && promoValue > 0) {
    if (promoType === 'percentage') {
      // Compute per-product promoted price
      const promoPrice = parseFloat((price * (1 - promoValue / 100)).toFixed(2));
      displayPrice = promoPrice;
      strikePrice  = price; // cross-out pre-promo selling price
      // Show effective % off from MRP when possible, else the promo % itself
      badgePercent = mrp > promoPrice
        ? Math.round(((mrp - promoPrice) / mrp) * 100)
        : Math.round(promoValue);
    } else if (promoType === 'flat') {
        // Flat = ₹X off this product regardless of quantity
        displayPrice = parseFloat(Math.max(0, price - promoValue).toFixed(2));
        strikePrice  = price;
        flatBadgeAmt = promoValue;
        if (mrp > displayPrice) {
          badgePercent = Math.round(((mrp - displayPrice) / mrp) * 100);
        }
    }
  } else if (mrp > price) {
    // No active promo — regular MRP vs selling price
    badgePercent = Math.round(((mrp - price) / mrp) * 100);
    strikePrice  = mrp;
  }

  const hasDiscount = badgePercent != null || flatBadgeAmt != null || (strikePrice != null && strikePrice > displayPrice);
  const discountPercent = badgePercent ?? 0; // kept for any remaining references
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const [adding, setAdding] = useState(false);
  const [isWholesale] = useState(() => {
    try {
      const raw = secureStorage.getItem("user");
      if (!raw) return false;
      const u = JSON.parse(raw);
      return u.user_type === "wholesale" || u.role === "wholesale_customer";
    } catch {
      return false;
    }
  });

  const maxQuantity = isWholesale ? 999999 : product.max_order_quantity || 10;
  const atMaxQuantity = !isWholesale && qty >= maxQuantity;
  const accent = themeColor || "#C2410C";

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    setAdding(true);
    await addItem(product, 1);
    setTimeout(() => setAdding(false), 300);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden
        border border-white/60 shadow-md
        hover:shadow-2xl hover:scale-[1.03]
        transition-all duration-300 ease-out h-full w-full"
    >
      {/* Image area */}
      <div className="relative w-full bg-linear-to-br from-orange-50 to-amber-50 aspect-square overflow-hidden">
        {/* Discount badge — top-left */}
        {!isOutOfStock && (badgePercent != null || flatBadgeAmt != null) && (
          <div
            className="absolute top-0 left-0 z-10 text-white text-center px-2 py-1.5 rounded-br-xl min-w-11"
            style={{ backgroundColor: accent }}
          >
            {flatBadgeAmt != null ? (
              <>
                <div className="text-[9px] font-black leading-none">₹{flatBadgeAmt}</div>
                <div className="text-[9px] font-bold tracking-wide leading-none mt-0.5">OFF</div>
              </>
            ) : (
              <>
                <div className="text-sm font-black leading-none">{badgePercent}%</div>
                <div className="text-[9px] font-bold tracking-wide leading-none mt-0.5">OFF</div>
              </>
            )}
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute top-0 left-0 z-10 bg-gray-500 text-white text-[10px] font-extrabold leading-tight px-2 py-1.5 text-center rounded-br-xl">
            OUT OF
            <br />
            STOCK
          </div>
        )}

        {/* Festival Special tag — top-right */}
        {!isOutOfStock && (
          <div className="absolute top-2 right-2 z-10 bg-amber-400 text-amber-900 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap flex items-center gap-1">
            <SparklesIcon className="w-2.5 h-2.5 shrink-0" /> Festival Special
          </div>
        )}

        {/* Promo badge below tag */}
        {promo?.badge_text && !isOutOfStock && (
          <span
            className="absolute top-8 right-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
            style={{ backgroundColor: promo.theme_color || accent }}
          >
            {promo.badge_text}
          </span>
        )}

        {/* Product image */}
        <div className="w-full h-full flex items-center justify-center p-4 transition-transform duration-300 group-hover:scale-105">
          <ImageWithFallback
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-contain ${isOutOfStock ? "opacity-40 grayscale" : ""}`}
            size="lg"
            centered
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-1.5">
        {/* Name */}
        <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 min-h-[2.4rem]">
          {product.name}
        </h3>

        {/* Unit */}
        <p className="text-[11px] text-gray-400 font-medium">
          {product.unit_pack_size || product.unit_type || "1 unit"}
        </p>

        {/* Low stock indicator */}
        {isLowStock && !isOutOfStock && (
          <div className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-500 font-bold">
              Only {stock} left!
            </span>
          </div>
        )}

        {/* Deal progress bars — only shown when at least one limit is configured */}
        {!isOutOfStock && (dealLimit !== null || itemLimit !== null) && (
          <div className="mt-0.5 space-y-1">
            {dealExhausted ? (
              <p className="text-[9px] font-extrabold text-red-500 text-center py-0.5">
                🚫 Deal Ended · Regular price applies
              </p>
            ) : (
              <>
                {/* Per-order deal bar */}
                {dealLimit !== null && (
                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-gray-400 font-semibold">Deals Left</span>
                      <span className="text-[9px] font-extrabold" style={{ color: accent }}>
                        {dealsRemaining}/{dealLimit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${dealPct}%`,
                          background: dealPct <= 20
                            ? `linear-gradient(to right, #ef4444, #f97316)`
                            : `linear-gradient(to right, ${accent}, #FBBF24)`,
                        }}
                      />
                    </div>
                    {dealPct <= 20 && (
                      <p className="text-[8px] font-bold text-red-500 mt-0.5">
                        ⚡ Only {dealsRemaining} deal{dealsRemaining !== 1 ? "s" : ""} left!
                      </p>
                    )}
                  </div>
                )}

                {/* Per-unit item bar */}
                {itemLimit !== null && (
                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-gray-400 font-semibold">Units at Offer Price</span>
                      <span className="text-[9px] font-extrabold" style={{ color: accent }}>
                        {itemsRemaining}/{itemLimit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${itemPct}%`,
                          background: itemPct <= 20
                            ? `linear-gradient(to right, #ef4444, #f97316)`
                            : `linear-gradient(to right, #8B5CF6, #EC4899)`,
                        }}
                      />
                    </div>
                    {itemPct <= 20 && (
                      <p className="text-[8px] font-bold text-red-500 mt-0.5">
                        🔥 Only {itemsRemaining} unit{itemsRemaining !== 1 ? "s" : ""} left at this price!
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Price + ADD button */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-gray-900 leading-tight">
              ₹{Math.round(displayPrice)}
            </span>
            {strikePrice != null && strikePrice > displayPrice && (
              <span className="text-[11px] text-gray-400 line-through leading-none">
                ₹{Math.round(strikePrice)}
              </span>
            )}
          </div>

          {isOutOfStock ? (
            <span className="text-xs text-gray-400 font-semibold">
              Unavailable
            </span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-extrabold px-4 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-60 min-w-14 shadow-sm"
            >
              {adding ? (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "ADD"
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <div
                onClick={(e) => e.preventDefault()}
                className="flex items-center border-2 border-green-500 rounded-lg overflow-hidden"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    updateQty(product.id, qty - 1);
                  }}
                  className="px-2 py-1.5 hover:bg-green-50 text-green-600 transition-colors font-bold"
                  aria-label="Decrease"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-extrabold text-green-700 min-w-5.5 text-center py-1.5">
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
                  className="px-2 py-1.5 hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40 font-bold"
                  aria-label="Increase"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {atMaxQuantity && (
                <span className="text-[9px] text-orange-500 font-semibold text-center">
                  Max {maxQuantity}/order
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────── Skeleton card ─────────── */
function SkeletonCard() {
  return (
    <div className="w-50 sm:w-55 md:w-60 shrink-0 animate-pulse rounded-2xl overflow-hidden bg-white/30">
      <div className="aspect-square bg-white/40 rounded-t-2xl" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-white/40 rounded w-3/4" />
        <div className="h-3 bg-white/40 rounded w-1/2" />
        <div className="h-2 bg-white/30 rounded w-full" />
        <div className="h-8 bg-white/40 rounded mt-2" />
      </div>
    </div>
  );
}

/* ─────────── Main Section ─────────── */
export default function PromotionalProducts() {
  const { lang } = useLanguage();
  const {
    activePromos,
    productPromoMap,
    loading: promoLoading,
  } = usePromotions();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useRef(null);

  const promo = activePromos.find((p) => (p.products || []).length > 0);

  const fetchProducts = useCallback(async () => {
    if (!promo) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const productIds = (promo.products || []).map((p) => p.id);
      if (!productIds.length) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const idParams = productIds.map((id) => `id=${id}`).join("&");
      const res = await fetch(
        `${API_URL}/products?is_active=true&${idParams}&lang=${lang}`,
      );
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setProducts((json.data || []).filter((p) => productIds.includes(p.id)));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [promo, lang]);

  useEffect(() => {
    if (!promoLoading) fetchProducts();
  }, [promoLoading, fetchProducts]);

  const productGroups = useMemo(
    () => groupProductsByVariant(products),
    [products],
  );

  const updateScrollBtns = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollBtns, { passive: true });
    updateScrollBtns();
    return () => el.removeEventListener("scroll", updateScrollBtns);
  }, [loading]);

  // Do not show the section until we have a confirmed active promo.
  if (!promo) return null;

  const shouldShowSkeleton = loading && productGroups.length === 0;

  const themeColor = promo?.theme_color || "#C2410C";
  const title = promo?.title || "Diwali Mega Sale";
  const endsAt = promo?.ends_at;

  // Deep maroon-orange → gold festive gradient
  const gradientBg = `linear-gradient(135deg, #7C2D12 0%, ${themeColor} 45%, #B45309 80%, #92400E 100%)`;

  return (
    <section className="relative overflow-hidden print:hidden w-full">
      {/* Festive gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: gradientBg }}
      />

      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Diya corner decorations */}
      <DiyaSvg className="absolute bottom-0 left-0 w-28 h-28 sm:w-36 sm:h-36 text-amber-300 opacity-20 pointer-events-none z-0" />
      <DiyaSvg className="absolute bottom-0 right-0 w-28 h-28 sm:w-36 sm:h-36 text-amber-300 opacity-20 pointer-events-none z-0 transform-[scaleX(-1)]" />

      {/* Sparkles */}
      <SparklesSvg className="absolute top-0 left-0 w-32 h-32 text-amber-200 opacity-30 pointer-events-none z-0" />
      <SparklesSvg className="absolute top-0 right-0 w-32 h-32 text-amber-200 opacity-30 pointer-events-none z-0 rotate-90" />

      {/* Content */}
      <div className="relative z-10 max-w-300 mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5">
          {/* Left: title + countdown */}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow leading-tight flex items-center gap-2">
              <GiftIcon className="w-7 h-7 shrink-0" /> {title}
            </h2>
            {endsAt && <LiveCountdown endsAt={endsAt} />}
          </div>

          {/* Right: View All + arrow buttons */}
          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <Link
              href="/products"
              className="text-[#86efac] hover:text-[#bbf7d0] text-sm font-bold transition-colors whitespace-nowrap"
            >
              View All
            </Link>
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className="p-2 rounded-full bg-white/20 hover:bg-white/40 border border-white/30 text-white transition-all duration-150 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className="p-2 rounded-full bg-white/20 hover:bg-white/40 border border-white/30 text-white transition-all duration-150 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {shouldShowSkeleton
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-50 sm:w-55 md:w-60 shrink-0 snap-start"
                >
                  <SkeletonCard />
                </div>
              ))
            : productGroups.map((group, idx) => (
                <div
                  key={`${group.name}-${idx}`}
                  className="w-50 sm:w-55 md:w-60 shrink-0 snap-start"
                >
                  <FestiveProductCard
                    product={group.variants[0]}
                    themeColor={themeColor}
                  />
                </div>
              ))}
        </div>

        {/* Mobile swipe hint */}
        <p className="sm:hidden text-center text-white/50 text-[10px] font-semibold mt-3 tracking-wide">
          ← Swipe to explore more →
        </p>
      </div>
    </section>
  );
}

"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Zap, Clock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { usePromotions } from "@/context/PromotionContext";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import CountdownTimer from "@/components/common/CountdownTimer";
import { groupProductsByVariant } from "@/lib/productGrouping";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
export default function PromotionalProducts() {
  const { lang } = useLanguage();
  const { activePromos, productPromoMap, loading: promoLoading } = usePromotions();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const scrollRef = useRef(null);
  const promo = activePromos.find(p => {
    const linked = p.products || [];
    // Only show promotions that have products attached
    return linked.length > 0;
  });
  const fetchProducts = useCallback(async () => {
    if (!promo) { setProducts([]); setLoading(false); return; }
    try {
      setLoading(true);
      const productIds = (promo.products || []).map(p => p.id);
      if (productIds.length === 0) { setProducts([]); setLoading(false); return; }
      console.log('[PromotionalProducts] Fetching products for promotion:', promo.title);
      console.log('[PromotionalProducts] Product IDs from promo:', productIds);
      const idParams = productIds.map(id => `id=${id}`).join('&');
      const res = await fetch(
        `${API_URL}/products?is_active=true&${idParams}&lang=${lang}`
      );
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      const fetchedProducts = json.data || [];
      console.log('[PromotionalProducts] Fetched products:', fetchedProducts.length, fetchedProducts.map(p => p.name));
      // Double-filter to handle edge cases where API returns extra products
      const filtered = fetchedProducts.length > 0 
        ? fetchedProducts.filter(p => productIds.includes(p.id))
        : [];
      console.log('[PromotionalProducts] Final filtered products:', filtered.length);
      setProducts(filtered);
    } catch (err) {
      console.error('[PromotionalProducts] Fetch error:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [promo, lang]);
  useEffect(() => {
    if (!promoLoading) fetchProducts();
  }, [promoLoading, fetchProducts]);
  const productGroups = useMemo(() => {
    // Group variants together for cleaner display (e.g., show "Vim" with size options)
    return groupProductsByVariant(products);
  }, [products]);
  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };
  if (!promoLoading && !loading && productGroups.length === 0) return null;
  // Use promotion's theme color for branding consistency
  const themeColor = promo?.theme_color || "#FF6B00";
  const title = promo?.title || "Limited Time Offers";
  const endsAt = promo?.ends_at;
  const Skeleton = () => (
    <div className="w-44 sm:w-52 flex-shrink-0 animate-pulse">
      <div className="bg-gray-200 rounded-xl h-52 mb-2" />
      <div className="bg-gray-200 h-3 rounded w-3/4 mb-1" />
      <div className="bg-gray-200 h-3 rounded w-1/2" />
    </div>
  );
  return (
    <section className="py-10" style={{ background: `linear-gradient(to bottom, ${themeColor}08, transparent)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        { }
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-white p-2 rounded-lg animate-pulse-glow" style={{ backgroundColor: themeColor }}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
              {endsAt && (
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Ends in</span>
                  <CountdownTimer endsAt={endsAt} compact themeColor={themeColor} />
                </div>
              )}
            </div>
          </div>
          {!loading && productGroups.length > 0 && (
            <div className="hidden sm:flex gap-2">
              <button onClick={() => scroll("left")}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                aria-label="Scroll left">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => scroll("right")}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                aria-label="Scroll right">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
        { }
        <div ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
            : productGroups.map((group, idx) => (
                <div key={`${group.name}-${idx}`} className="w-44 sm:w-52 flex-shrink-0 snap-start">
                  {group.variants.length > 1 ? (
                    <ProductCardWithVariants variants={group.variants} />
                  ) : (
                    <ProductCard product={group.variants[0]} />
                  )}
                </div>
              ))
          }
        </div>
      </div>
    </section>
  );
}

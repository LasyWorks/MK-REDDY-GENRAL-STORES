"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import secureStorage from "@/lib/secureStorage";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const CACHE_KEY = "mk_promo_cache";
const CACHE_TTL = 300_000; // 5 minutes

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = secureStorage.session.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

function writeCache(data) {
  if (typeof window === "undefined") return;
  try { secureStorage.session.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
const PromotionContext = createContext({
  activePromos: [],          
  productPromoMap: {},       
  loading: true,
  wholesaleDiscountPct: 0,
  storeSettings: { min_order_amount: 100, delivery_charge: 0, handling_charge: 2 },
  refresh: () => {},
});
export function PromotionProvider({ children }) {
  const [activePromos, setActivePromos]       = useState([]);
  const [productPromoMap, setProductPromoMap] = useState({});
  const [loading, setLoading]                 = useState(true);
  const [wholesaleDiscountPct, setWholesaleDiscountPct] = useState(0);
  const [storeSettings, setStoreSettings] = useState({ min_order_amount: 100, delivery_charge: 0, handling_charge: 2 });
  const refresh = useCallback(async () => {
    try {
      const [promosRes, mapRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/promotions/active`).then(r => r.ok ? r.json() : { data: [] }),
        fetch(`${API_URL}/promotions/product-map`).then(r => r.ok ? r.json() : { data: {} }),
        fetch(`${API_URL}/settings/public`).then(r => r.ok ? r.json() : { data: {} }),
      ]);
      const ap = promosRes.data || [];
      const pm = mapRes.data || {};
      const sd = settingsRes.data || {};
      const pct = sd.wholesale_discount_pct;
      const wPct = pct != null ? parseFloat(pct) : 0;
      const ss = {
        min_order_amount: sd.min_order_amount ?? 100,
        delivery_charge: sd.delivery_charge ?? 0,
        handling_charge: sd.handling_charge ?? 2,
      };
      setActivePromos(ap);
      setProductPromoMap(pm);
      setWholesaleDiscountPct(wPct);
      setStoreSettings(ss);
      writeCache({ activePromos: ap, productPromoMap: pm, wholesaleDiscountPct: wPct, storeSettings: ss });
    } catch {
      setActivePromos([]);
      setProductPromoMap({});
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setActivePromos(cached.activePromos || []);
      setProductPromoMap(cached.productPromoMap || {});
      setWholesaleDiscountPct(cached.wholesaleDiscountPct || 0);
      setStoreSettings(cached.storeSettings || { min_order_amount: 100, delivery_charge: 0, handling_charge: 2 });
      setLoading(false);
    } else {
      refresh();
    }
    const interval = setInterval(refresh, 300_000);
    return () => clearInterval(interval);
  }, [refresh]);
  return (
    <PromotionContext.Provider value={{ activePromos, productPromoMap, loading, wholesaleDiscountPct, storeSettings, refresh }}>
      {children}
    </PromotionContext.Provider>
  );
}
export function usePromotions() {
  return useContext(PromotionContext);
}
export default PromotionContext;

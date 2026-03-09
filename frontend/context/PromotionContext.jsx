"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const PromotionContext = createContext({
  activePromos: [],          
  productPromoMap: {},       
  loading: true,
  wholesaleDiscountPct: 0,
  refresh: () => {},
});
export function PromotionProvider({ children }) {
  const [activePromos, setActivePromos]       = useState([]);
  const [productPromoMap, setProductPromoMap] = useState({});
  const [loading, setLoading]                 = useState(true);
  const [wholesaleDiscountPct, setWholesaleDiscountPct] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const [promosRes, mapRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/promotions/active`).then(r => r.ok ? r.json() : { data: [] }),
        fetch(`${API_URL}/promotions/product-map`).then(r => r.ok ? r.json() : { data: {} }),
        fetch(`${API_URL}/settings/public`).then(r => r.ok ? r.json() : { data: {} }),
      ]);
      setActivePromos(promosRes.data || []);
      setProductPromoMap(mapRes.data || {});
      const pct = settingsRes.data?.wholesale_discount_pct;
      setWholesaleDiscountPct(pct != null ? parseFloat(pct) : 0);
    } catch {
      setActivePromos([]);
      setProductPromoMap({});
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);
  return (
    <PromotionContext.Provider value={{ activePromos, productPromoMap, loading, wholesaleDiscountPct, refresh }}>
      {children}
    </PromotionContext.Provider>
  );
}
export function usePromotions() {
  return useContext(PromotionContext);
}
export default PromotionContext;

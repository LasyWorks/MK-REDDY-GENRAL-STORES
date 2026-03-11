"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import categoryService from "@/services/categoryService";
import secureStorage from "@/lib/secureStorage";

const CACHE_KEY = "mk_category_cache";
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

const CategoryContext = createContext({
  categories: [],
  loading: true,
});

export function CategoryProvider({ children }) {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [categories, setCategories] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    try {
      const res = await categoryService.getAll({ limit: 200 });
      const cats = res.data || [];
      setCategories(cats);
      writeCache(cats);
    } catch {
      // keep whatever we have
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CategoryContext.Provider value={{ categories, loading }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoryContext);
}

export default CategoryContext;

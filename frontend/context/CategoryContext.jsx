"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import categoryService from "@/services/categoryService";
import secureStorage from "@/lib/secureStorage";
import { useLanguage } from "@/context/LanguageContext";

const CACHE_KEY = "mk_category_cache";
const CACHE_TTL = 300_000; // 5 minutes

function readCache(lang) {
  if (typeof window === "undefined") return null;
  try {
    const raw = secureStorage.session.getItem(`${CACHE_KEY}_${lang}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

function writeCache(lang, data) {
  if (typeof window === "undefined") return;
  try { secureStorage.session.setItem(`${CACHE_KEY}_${lang}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

const CategoryContext = createContext({
  categories: [],
  loading: true,
});

export function CategoryProvider({ children }) {
  const { lang } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await categoryService.getAll({ limit: 200, lang });
      const cats = res.data || [];
      setCategories(cats);
      writeCache(lang, cats);
    } catch {
      // keep whatever we have
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    const cached = readCache(lang);
    if (cached) {
      setCategories(cached);
      setLoading(false);
    } else {
      refresh();
    }
  }, [lang, refresh]);

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

"use client";
import { createContext, useContext, useState, useEffect } from "react";
const STORAGE_KEY = "mk-reddy-lang";
const LEGACY_STORAGE_KEY = "language";
const COOKIE_KEY = "mk-reddy-lang";
const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
});
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");
  useEffect(() => {
    const saved =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved === "te" || saved === "en") {
      queueMicrotask(() => {
        setLangState(saved);
        localStorage.setItem(STORAGE_KEY, saved);
        localStorage.setItem(LEGACY_STORAGE_KEY, saved);
        document.cookie = `${COOKIE_KEY}=${saved}; path=/; max-age=31536000; samesite=lax`;
      });
    }
  }, []);
  const setLang = (code) => {
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem(LEGACY_STORAGE_KEY, code);
    document.cookie = `${COOKIE_KEY}=${code}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  return useContext(LanguageContext);
}

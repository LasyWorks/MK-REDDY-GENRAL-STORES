"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageWithFallback from "./ImageWithFallback";
import { useLanguage } from "@/context/LanguageContext";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const DEBOUNCE_MS = 350;
export default function Searchbar() {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const router = useRouter();
  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/products?search=${encodeURIComponent(q)}&limit=8&is_active=true&lang=${lang}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("search failed");
      const json = await res.json();
      setResults(json.data || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true); 
    timerRef.current = setTimeout(() => doSearch(val), DEBOUNCE_MS);
  };
  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      clearTimeout(timerRef.current);
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };
  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      { }
      <div className="flex items-center bg-[#f1f5f9] rounded-lg px-4 py-2.5 w-full gap-2 focus-within:ring-2 focus-within:ring-blue-400 transition-all">
        {loading ? (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for groceries, vegetables, fruits..."
          className="bg-transparent border-none outline-none w-full text-gray-700 placeholder-gray-400 text-[15px]"
          autoComplete="off"
        />
        {query && (
          <button onClick={handleClear} className="flex-shrink-0" aria-label="Clear search">
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
          </button>
        )}
      </div>
      { }
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No products found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <p className="px-4 pt-3 pb-2 text-[11px] text-gray-400 uppercase font-semibold tracking-wide">
                {results.length} result{results.length > 1 ? "s" : ""}
              </p>
              {results.map((product) => (
                <SearchResultItem
                  key={product.id}
                  product={product}
                  query={query}
                  onSelect={() => setOpen(false)}
                />
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-blue-600 font-medium border-t border-gray-50 hover:bg-blue-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                See all results for &ldquo;{query}&rdquo;
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
function SearchResultItem({ product, query, onSelect }) {
  const price = parseFloat(product.price || 0);
  const mrp = parseFloat(product.mrp || 0);
  const hasDiscount = mrp > price;
  const highlighted = highlightMatch(product.name || "", query);
  return (
    <Link
      href={`/products/${product.id}`}
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">🛒</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
        {product.unit_pack_size && (
          <p className="text-xs text-gray-400">{product.unit_pack_size}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">₹{price.toFixed(0)}</p>
        {hasDiscount && (
          <p className="text-[10px] text-gray-400 line-through">₹{mrp.toFixed(0)}</p>
        )}
      </div>
    </Link>
  );
}
function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    `<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">$1</mark>`
  );
}
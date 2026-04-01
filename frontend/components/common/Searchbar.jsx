"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MagnifyingGlassIcon as Search,
  XMarkIcon as X,
  ArrowPathIcon as Loader2,
  ShoppingCartIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { translateToEnglish, normalizeTranscript } from "@/lib/voiceSearch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const DEBOUNCE_MS = 250;
const SILENCE_STOP_MS = 5000; // auto-stop mic after 5s of silence

export default function Searchbar() {
  const { lang } = useLanguage();
  const [query, setQuery] = useState(""); // what user sees in input
  const [searchTerm, setSearchTerm] = useState(""); // English term sent to API
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [langMode, setLangMode] = useState("en-IN");
  const [mounted, setMounted] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedLabel, setTranslatedLabel] = useState("");
  const timerRef = useRef(null);
  const silenceRef = useRef(null);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const router = useRouter();

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const doSearch = useCallback(
    async (term) => {
      const clean = normalizeTranscript(term);
      if (!clean) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        // 1) Full-phrase search
        const res = await fetch(
          `${API_URL}/products?search=${encodeURIComponent(clean)}&limit=8&is_active=true&lang=${lang}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        let data = json.data || [];

        // 2) Fallback: if no results and phrase has multiple words, search each word
        if (data.length === 0) {
          const words = clean.split(/\s+/).filter((w) => w.length > 2);
          if (words.length > 1) {
            const wordResults = await Promise.all(
              words.map((w) =>
                fetch(
                  `${API_URL}/products?search=${encodeURIComponent(w)}&limit=6&is_active=true&lang=${lang}`,
                  { cache: "no-store" },
                )
                  .then((r) => (r.ok ? r.json() : { data: [] }))
                  .then((j) => j.data || [])
                  .catch(() => []),
              ),
            );
            // Merge, dedupe by id, score by how many word queries matched
            const scoreMap = new Map();
            wordResults.forEach((list) => {
              list.forEach((p) => {
                const prev = scoreMap.get(p.id);
                scoreMap.set(
                  p.id,
                  prev
                    ? { ...prev, _score: prev._score + 1 }
                    : { ...p, _score: 1 },
                );
              });
            });
            data = [...scoreMap.values()]
              .sort((a, b) => b._score - a._score)
              .slice(0, 8);
          }
        }

        // 3) Last resort: single-keyword fallback (first meaningful word)
        if (data.length === 0) {
          const firstWord =
            clean.split(/\s+/).find((w) => w.length > 2) || clean;
          const fb = await fetch(
            `${API_URL}/products?search=${encodeURIComponent(firstWord)}&limit=8&is_active=true&lang=${lang}`,
            { cache: "no-store" },
          )
            .then((r) => (r.ok ? r.json() : { data: [] }))
            .catch(() => ({ data: [] }));
          data = fb.data || [];
        }

        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  // Live interim display + silence auto-stop
  useEffect(() => {
    if (!listening) return;
    const live = interimTranscript || transcript;
    if (live) setQuery(live);
    clearTimeout(silenceRef.current);
    silenceRef.current = setTimeout(() => {
      SpeechRecognition.stopListening();
    }, SILENCE_STOP_MS);
  }, [interimTranscript, transcript, listening]);

  // Final result → translate → search
  useEffect(() => {
    if (!finalTranscript.trim()) return;
    const raw = normalizeTranscript(finalTranscript);
    setQuery(raw);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      let term = raw;
      if (langMode === "te-IN") {
        setTranslating(true);
        term = await translateToEnglish(raw, langMode);
        setTranslating(false);
        setTranslatedLabel(term !== raw ? `🔍 Searching: "${term}"` : "");
      } else {
        setTranslatedLabel("");
      }
      setSearchTerm(term);
      doSearch(term);
    }, DEBOUNCE_MS);
  }, [finalTranscript, langMode, doSearch]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setTranslatedLabel("");
    clearTimeout(timerRef.current);
    if (!val.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setSearchTerm("");
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      setSearchTerm(val);
      doSearch(val);
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery("");
    setSearchTerm("");
    setResults([]);
    setOpen(false);
    setTranslatedLabel("");
    resetTranscript();
    clearTimeout(silenceRef.current);
    if (listening) SpeechRecognition.stopListening();
    inputRef.current?.focus();
  };

  const toggleVoice = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      setQuery("");
      setSearchTerm("");
      setResults([]);
      setOpen(false);
      setTranslatedLabel("");
      SpeechRecognition.startListening({
        continuous: true,
        interimResults: true,
        language: langMode,
      });
      inputRef.current?.focus();
    }
  };

  const cycleLang = () => {
    clearTimeout(silenceRef.current);
    if (listening) SpeechRecognition.stopListening();
    setLangMode((prev) => (prev === "en-IN" ? "te-IN" : "en-IN"));
    setTranslatedLabel("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (searchTerm || query).trim()) {
      clearTimeout(timerRef.current);
      setOpen(false);
      router.push(
        `/search?q=${encodeURIComponent((searchTerm || query).trim())}`,
      );
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showVoiceUI = mounted && browserSupportsSpeechRecognition;
  const showLiveState = listening || translating;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      {/* Listening banner */}
      {showLiveState && (
        <div className="absolute -top-10 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-white border border-green-200 rounded-full text-[11px] text-green-700 font-medium z-10 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${listening ? "bg-red-500 animate-pulse" : "bg-blue-500 animate-pulse"}`} />
            {listening
              ? `Listening in ${langMode === "te-IN" ? "Telugu" : "English"}`
              : "Converting speech to search"}
          </div>
          <button
            onClick={cycleLang}
            className="underline text-green-600 font-bold"
          >
            {langMode === "te-IN" ? "Use English" : "Use Telugu"}
          </button>
        </div>
      )}

      <div
        className={`flex items-center rounded-xl px-4 py-2.5 w-full gap-2 transition-all ${
          listening
            ? "bg-red-50 ring-2 ring-red-300"
            : "bg-[#f1f5f9] focus-within:ring-2 focus-within:ring-blue-300"
        }`}
      >
        {loading || translating ? (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={
              listening
                ? `Listening in ${langMode === "te-IN" ? "Telugu" : "English"}...`
                : "Search for groceries, vegetables, fruits..."
            }
            className="bg-transparent border-none outline-none w-full text-gray-700 placeholder-gray-400 text-[15px]"
            autoComplete="off"
          />
          {translatedLabel && (
            <span className="text-[11px] text-blue-500 font-medium leading-tight">
              🔍 {translatedLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {query && (
            <button onClick={handleClear} aria-label="Clear search">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
            </button>
          )}
          {showVoiceUI && (
            <>
              <button
                onClick={cycleLang}
                title={`Currently: ${langMode === "te-IN" ? "Telugu" : "English"} — click to switch`}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-colors select-none ${
                  langMode === "te-IN"
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "bg-blue-50 text-blue-600 border-blue-200"
                }`}
              >
                {langMode === "te-IN" ? "TE" : "EN"}
              </button>
              <button
                onClick={toggleVoice}
                aria-label={
                  listening ? "Stop voice search" : "Start voice search"
                }
                title={
                  listening
                    ? "Click to stop"
                    : `Voice search (${langMode === "te-IN" ? "Telugu" : "English"})`
                }
                className={`p-1 rounded-full transition-all ${
                  listening
                    ? "bg-red-500 text-white shadow-md scale-110"
                    : "text-gray-400 hover:text-blue-500"
                }`}
              >
                <MicrophoneIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No products found for &ldquo;{searchTerm || query}&rdquo;
            </div>
          ) : (
            <>
              <p className="sticky top-0 bg-white px-4 pt-3 pb-2 text-[11px] text-gray-400 uppercase font-semibold tracking-wide border-b border-gray-50 z-10">
                {results.length} result{results.length > 1 ? "s" : ""}
                {translatedLabel && (
                  <span className="ml-2 text-blue-400 normal-case font-normal">
                    ({translatedLabel.replace(/^🔍\s*/, "")})
                  </span>
                )}
              </p>
              {results.map((product) => (
                <SearchResultItem
                  key={product.id}
                  product={product}
                  query={searchTerm || query}
                  onSelect={() => setOpen(false)}
                />
              ))}
              <Link
                href={`/search?q=${encodeURIComponent((searchTerm || query).trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-blue-600 font-medium border-t border-gray-50 hover:bg-blue-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                See all results for &ldquo;{searchTerm || query}&rdquo;
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
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartIcon className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
        {(product.unit_pack_size || product.variant) && (
          <p className="text-xs text-gray-400">{product.unit_pack_size || product.variant}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">₹{price.toFixed(0)}</p>
        {hasDiscount && (
          <p className="text-[10px] text-gray-400 line-through">
            ₹{mrp.toFixed(0)}
          </p>
        )}
      </div>
    </Link>
  );
}

function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safeText.replace(
    new RegExp(`(${escaped})`, "gi"),
    `<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">$1</mark>`,
  );
}

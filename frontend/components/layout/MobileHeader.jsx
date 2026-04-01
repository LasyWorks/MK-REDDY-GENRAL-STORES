"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  UserCircleIcon,
  ShoppingCartIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import authService from "@/services/authService";
import secureStorage from "@/lib/secureStorage";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { translateToEnglish, normalizeTranscript } from "@/lib/voiceSearch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const DEBOUNCE_MS = 250;
const SILENCE_STOP_MS = 5000;

export default function MobileHeader() {
  const { totalCount, openCart } = useCart();
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  // Category detail pages (/categories/[id]) have their own sticky header
  if (/^\/(categories|products)\/[^/]+/.test(pathname)) return null;
  const [query, setQuery] = useState("");           // what user sees
  const [searchTerm, setSearchTerm] = useState(""); // English term sent to API
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedLabel, setTranslatedLabel] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPicture, setUserPicture] = useState(null);
  const [userInitials, setUserInitials] = useState("");
  const [langMode, setLangMode] = useState("en-IN");
  const [mounted, setMounted] = useState(false);    // hydration fix
  const timerRef = useRef(null);
  const silenceRef = useRef(null);
  const inputRef = useRef(null);

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Only show voice UI after client mounts — prevents hydration mismatch
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const check = () => {
      const loggedIn = authService.isAuthenticated();
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        try {
          const user = JSON.parse(secureStorage.getItem("user") || "{}");
          setUserPicture(user.profile_picture || null);
          const initials =
            user.name
              ?.trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("") || "?";
          setUserInitials(initials);
        } catch {
          setUserPicture(null);
          setUserInitials("?");
        }
      } else {
        setUserPicture(null);
        setUserInitials("");
      }
    };
    check();
    window.addEventListener("authChange", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("authChange", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  const doSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    setLoading(true);
    try {
      // 1) Full-phrase search
      const res = await fetch(
        `${API_URL}/products?search=${encodeURIComponent(term)}&limit=6&is_active=true`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      let data = json.data || [];

      // 2) Fallback: if no results and phrase has multiple words, search each word
      if (data.length === 0) {
        const words = term.split(/\s+/).filter((w) => w.length > 2);
        if (words.length > 1) {
          const wordResults = await Promise.all(
            words.map((w) =>
              fetch(
                `${API_URL}/products?search=${encodeURIComponent(w)}&limit=5&is_active=true`,
                { cache: "no-store" },
              )
                .then((r) => r.ok ? r.json() : { data: [] })
                .then((j) => j.data || [])
                .catch(() => []),
            ),
          );
          const scoreMap = new Map();
          wordResults.forEach((list) => {
            list.forEach((p) => {
              const prev = scoreMap.get(p.id);
              scoreMap.set(p.id, prev ? { ...prev, _score: prev._score + 1 } : { ...p, _score: 1 });
            });
          });
          data = [...scoreMap.values()]
            .sort((a, b) => b._score - a._score)
            .slice(0, 6);
        }
      }

      // 3) Last resort: first keyword fallback
      if (data.length === 0) {
        const firstWord = term.split(/\s+/).find((w) => w.length > 2) || term;
        const fb = await fetch(
          `${API_URL}/products?search=${encodeURIComponent(firstWord)}&limit=6&is_active=true`,
          { cache: "no-store" },
        ).then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));
        data = fb.data || [];
      }

      setResults(data);
      setSearchOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        setTranslatedLabel(term !== raw ? `Searching: "${term}"` : "");
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
      setSearchOpen(false);
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (searchTerm || query).trim()) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent((searchTerm || query).trim())}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSearchTerm("");
    setResults([]);
    setSearchOpen(false);
    setTranslatedLabel("");
    resetTranscript();
    clearTimeout(silenceRef.current);
    if (listening) SpeechRecognition.stopListening();
  };

  const toggleVoice = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      setQuery("");
      setSearchTerm("");
      setResults([]);
      setSearchOpen(false);
      setTranslatedLabel("");
      SpeechRecognition.startListening({ continuous: true, interimResults: true, language: langMode });
      inputRef.current?.focus();
    }
  };

  const cycleLang = () => {
    clearTimeout(silenceRef.current);
    if (listening) SpeechRecognition.stopListening();
    setLangMode((prev) => (prev === "en-IN" ? "te-IN" : "en-IN"));
    setTranslatedLabel("");
  };

  const showVoiceUI = mounted && browserSupportsSpeechRecognition;
  const showLiveState = listening || translating;

  return (
    <header className="md:hidden sticky top-0 z-50 bg-white shadow-sm print:hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 h-14 gap-2">
        {/* Left: Logo + Store name */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="bg-[#16A34A] text-white font-extrabold text-sm rounded-lg w-9 h-9 flex items-center justify-center shadow-sm">
            MK
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm text-gray-900 leading-tight">
              MK Reddy
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              General Store
            </span>
          </div>
        </Link>

        {/* Center: Delivery location */}
        <div className="flex-1 flex justify-center">
          <button className="flex items-center gap-1 text-gray-700 active:opacity-70 transition-opacity">
            <MapPinIcon className="w-4 h-4 text-[#16A34A] shrink-0" />
            <div className="text-left leading-tight">
              <p className="text-[10px] text-gray-500 font-medium">
                Pick up at
              </p>
              <p className="text-xs font-semibold text-gray-800 truncate max-w-[80px]">
                Store
              </p>
            </div>
          </button>
        </div>

        {/* Right: Lang toggle + Profile + Cart */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              const nextLang = lang === "en" ? "te" : "en";
              setLang(nextLang);
              router.refresh();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
            aria-label="Switch language"
          >
            <span className="text-[11px] font-bold text-gray-600 leading-none">
              {lang === "en" ? "EN" : "తె"}
            </span>
          </button>
          <Link
            href={isLoggedIn ? "/profile" : "/login"}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
            aria-label="Profile"
          >
            {userPicture ? (
              <img
                src={userPicture}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover ring-2 ring-[#16A34A]/30"
                referrerPolicy="no-referrer"
              />
            ) : userInitials ? (
              <div className="w-7 h-7 rounded-full bg-[#16A34A] flex items-center justify-center text-white text-[11px] font-bold">
                {userInitials}
              </div>
            ) : (
              <UserCircleIcon className="w-6 h-6 text-gray-600" />
            )}
          </Link>

          <button
            onClick={openCart}
            className="relative w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCartIcon className="w-6 h-6 text-gray-700" />
            {totalCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-[#FF6B00] text-white text-[9px] font-extrabold rounded-full px-0.5 leading-none animate-bounce-once">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-3 pb-2.5 relative">
        {/* Voice listening banner */}
        {showLiveState && (
          <div className="flex items-center justify-between mb-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-full shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${listening ? "bg-red-500 animate-pulse" : "bg-blue-500 animate-pulse"}`} />
              <span className="text-[11px] text-green-700 font-medium">
                {listening
                  ? `Listening in ${langMode === "te-IN" ? "Telugu" : "English"}`
                  : "Converting speech to search"}
              </span>
            </div>
            <button
              onClick={cycleLang}
              className="text-[10px] text-green-600 font-bold underline"
            >
              {langMode === "te-IN" ? "Use English" : "Use Telugu"}
            </button>
          </div>
        )}
        <div
          className={`relative flex items-center rounded-full border transition-all duration-200 ${
            listening
              ? "border-red-400 bg-red-50 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
              : "bg-[#F7F7F7] border-gray-200 focus-within:border-[#16A34A] focus-within:bg-white"
          }`}
        >
          <MagnifyingGlassIcon className="absolute left-3.5 w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 flex flex-col pl-9 pr-20 py-2 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                listening
                    ? `Listening in ${langMode === "te-IN" ? "Telugu" : "English"}…`
                  : "Search groceries, fruits, snacks…"
              }
              className="bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none w-full"
              autoComplete="off"
            />
            {(loading || translating) && !query && (
              <span className="text-[10px] text-blue-400">Searching…</span>
            )}
            {translatedLabel && (
              <span className="text-[10px] text-blue-500 font-medium leading-tight">
                🔍 {translatedLabel}
              </span>
            )}
          </div>
          <div className="absolute right-2 flex items-center gap-1">
            {(loading || translating) && (
              <span className="w-3.5 h-3.5 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
            )}
            {query && !(loading || translating) && (
              <button
                onClick={handleClear}
                className="text-gray-400 active:text-gray-600 p-0.5"
                aria-label="Clear"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            {/* Language toggle — only after mount */}
            {showVoiceUI && (
              <button
                onClick={cycleLang}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-colors select-none ${
                  langMode === "te-IN"
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "bg-blue-50 text-blue-600 border-blue-200"
                }`}
                title={`Voice language: ${langMode === "te-IN" ? "Telugu" : "English"} — tap to switch`}
              >
                {langMode === "te-IN" ? "TE" : "EN"}
              </button>
            )}
            {/* Mic button — only after mount */}
            {showVoiceUI ? (
              <button
                onClick={toggleVoice}
                className={`p-1.5 rounded-full transition-all ${
                  listening
                    ? "bg-red-500 text-white shadow-md scale-110"
                    : "text-gray-400 active:text-[#16A34A] hover:text-[#16A34A]"
                }`}
                aria-label={listening ? "Stop voice search" : "Start voice search"}
              >
                <MicrophoneIcon className="w-4 h-4" />
              </button>
            ) : (
              <MicrophoneIcon className="w-4 h-4 text-gray-300" />
            )}
          </div>
        </div>

        {/* Search Dropdown */}
        {searchOpen && results.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-72 overflow-y-auto">
            {translatedLabel && (
              <p className="px-3 pt-2 pb-1 text-[11px] text-blue-500 font-medium">
                {translatedLabel.replace(/^🔍\s*/, "")}
              </p>
            )}
            {results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {product.name}
                  </p>
                  {(product.unit_pack_size || product.variant) && (
                    <p className="text-[11px] text-gray-400 truncate">
                      {product.unit_pack_size || product.variant}
                    </p>
                  )}
                  <p className="text-xs text-[#16A34A] font-bold">
                    ₹{Math.round(product.price)}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href={`/search?q=${encodeURIComponent((searchTerm || query).trim())}`}
              onClick={() => setSearchOpen(false)}
              className="block text-center text-xs text-[#16A34A] font-semibold py-2.5 bg-green-50 hover:bg-green-100 transition-colors"
            >
              See all results for "{searchTerm || query}"
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

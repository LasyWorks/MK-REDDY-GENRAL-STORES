"use client";
import Link from "next/link";
import {
  ChevronDownIcon as ChevronDown,
  ClipboardDocumentListIcon as ClipboardList,
  UserIcon as User,
  ShoppingCartIcon as ShoppingCart,
  GlobeAltIcon as Globe,
  ArrowRightOnRectangleIcon as LogIn,
} from "@heroicons/react/24/outline";
import Searchbar from "../common/Searchbar";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import authService from "@/services/authService";
import secureStorage from "@/lib/secureStorage";
export default function Navbar() {
  const { lang, setLang } = useLanguage();
  const { totalCount, openCart } = useCart();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPicture, setUserPicture] = useState(null);
  const [userInitials, setUserInitials] = useState("");

  useEffect(() => {
    const check = () => {
      const loggedIn = authService.isAuthenticated();
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        try {
          const user = JSON.parse(secureStorage.getItem("user") || "{}");
          setIsAdmin(user.user_type === "admin");
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
          setIsAdmin(false);
          setUserPicture(null);
          setUserInitials("?");
        }
      } else {
        setIsAdmin(false);
        setUserPicture(null);
        setUserInitials("");
      }
    };
    check();
    window.addEventListener("storage", check);
    window.addEventListener("authChange", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("authChange", check);
    };
  }, []);
  const languages = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  ];
  const currentLanguage = languages.find((l) => l.code === lang);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target)
      ) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <header className="hidden md:block w-full border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-8">
          {}
          <div className="flex items-center gap-8 shrink-0">
            {}
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-blue-600 text-white font-bold text-xl rounded-lg w-10 h-10 flex items-center justify-center">
                MK
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-2xl text-gray-900 tracking-tight leading-tight">
                  MK Reddy
                </span>
                <span className="text-sm text-gray-600 font-medium -mt-0.5">
                  General Store
                </span>
              </div>
            </Link>
            {}
          </div>
          {}
          <div className="flex-1 max-w-2xl hidden lg:block">
            <Searchbar />
          </div>
          {}
          <nav className="flex items-center gap-8 shrink-0">
            {}
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="hidden md:flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-[15px] transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span>{currentLanguage?.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {}
              {showLanguageMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                        lang === l.code
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{l.label}</span>
                        <span className="text-xs text-gray-500">
                          {l.nativeLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isLoggedIn ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin/dashboard"
                    prefetch={false}
                    className="hidden md:flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>
                ) : (
                  <Link
                    href="/orders"
                    prefetch={false}
                    className="hidden md:flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-[15px] transition-colors"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span>Orders</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  prefetch={false}
                  className="hidden md:flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-[15px] transition-colors"
                >
                  {userPicture ? (
                    <img
                      src={userPicture}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {userInitials || <User className="w-4 h-4" />}
                    </div>
                  )}
                  <span>Profile</span>
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
            {}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 text-blue-600 font-medium text-[15px] hover:text-blue-700 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">Cart</span>
              {totalCount > 0 && (
                <span className="absolute -top-2 -right-2 sm:-right-5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              )}
            </button>
          </nav>
        </div>
        {}
        <div className="pb-4 lg:hidden">
          <Searchbar />
        </div>
      </div>
    </header>
  );
}

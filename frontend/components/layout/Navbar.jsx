"use client";

import Link from "next/link";
import {
  MapPin,
  ChevronDown,
  ClipboardList,
  User,
  ShoppingCart,
  Globe,
} from "lucide-react";
import Searchbar from "../common/Searchbar";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef(null);

  const languages = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  ];

  const currentLanguage = languages.find(
    (lang) => lang.code === selectedLanguage,
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target)
      ) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLanguageMenu]);

  return (
    <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-8">
          {/* Left Section: Logo & Location */}
          <div className="flex items-center gap-8 shrink-0">
            {/* Logo */}
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

            {/* Location Selector */}
            <button className="hidden md:flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-[15px]">HSR Layout</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Middle Section: Search Bar */}
          <div className="flex-1 max-w-2xl hidden lg:block">
            <Searchbar />
          </div>

          {/* Right Section: Navigation Links */}
          <nav className="flex items-center gap-8 shrink-0">
            {/* Language Selector */}
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="hidden md:flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-[15px] transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span>{currentLanguage?.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Language Dropdown */}
              {showLanguageMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                        selectedLanguage === lang.code
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{lang.label}</span>
                        <span className="text-xs text-gray-500">
                          {lang.nativeLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/orders"
              className="hidden md:flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-[15px] transition-colors"
            >
              <ClipboardList className="w-5 h-5" />
              <span>Orders</span>
            </Link>

            <Link
              href="/profile"
              className="hidden md:flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-[15px] transition-colors"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 text-blue-600 font-medium text-[15px] hover:text-blue-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart</span>
            </Link>
          </nav>
        </div>

        {/* Mobile Search Bar (visible only on small screens) */}
        <div className="pb-4 lg:hidden">
          <Searchbar />
        </div>
      </div>
    </header>
  );
}

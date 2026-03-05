"use client";
import Link from "next/link";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronDownIcon as ChevronDown,
} from "@heroicons/react/24/outline";
import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import categoryService from "../../services/categoryService";

const toSlug = (name) =>
  name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") ?? "";

export default function CategoryNav() {
  const scrollContainerRef = useRef(null);
  const itemRefs = useRef({});
  const closeTimer = useRef(null);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const pathname = usePathname();

  // Only show categories/subcategories that have at least 1 product
  const parents = allCategories.filter(
    (c) => !c.parent_id && parseInt(c.product_count || 0) > 0,
  );
  const subMap = allCategories.reduce((acc, c) => {
    if (c.parent_id && parseInt(c.product_count || 0) > 0) {
      acc[c.parent_id] = acc[c.parent_id] || [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await categoryService.getAll({ limit: 200 });
        setAllCategories(res.data || []);
      } catch (e) {
        console.error("CategoryNav fetch failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scroll = (dir) => {
    scrollContainerRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), 300);
  };

  const handleMouseEnter = (parentId) => {
    cancelClose();
    const subs = subMap[parentId] || [];
    if (!subs.length) {
      scheduleClose();
      return;
    }
    const el = itemRefs.current[parentId];
    const container = scrollContainerRef.current;
    if (el && container) {
      const left = el.offsetLeft - container.scrollLeft + container.offsetLeft;
      setDropdownLeft(left);
    }
    setOpenMenu(parentId);
  };

  // Always use English name for slug (URL must be stable across languages)
  const slugOf = (c) => toSlug(c.name_en || c.name);

  const isParentActive = (parent) =>
    pathname.startsWith(`/category/${slugOf(parent)}`);

  const isSubActive = (parent, sub) =>
    pathname === `/category/${slugOf(parent)}/${slugOf(sub)}`;

  const openParent = parents.find((p) => p.id === openMenu);
  const openSubs = openParent ? subMap[openParent.id] || [] : [];
  const openParentSlug = openParent ? slugOf(openParent) : "";

  // Hide on admin pages
  if (pathname?.startsWith("/admin")) return null;

  return (
    // overflow-visible on the sticky bar so the dropdown escapes it
    <div className="hidden md:block bg-white border-b border-gray-100 sticky top-20 z-40 overflow-visible print:hidden py-3">
      <div className="max-w-7xl mx-auto px-6">
        {/* Outer wrapper: position:relative is the dropdown's anchor */}
        <div
          className="relative flex items-center"
          onMouseLeave={scheduleClose}
        >
          {/* Left scroll button */}
          {!loading && parents.length > 0 && (
            <div className="absolute left-0 z-10 flex items-center h-full bg-gradient-to-r from-white via-white to-transparent pr-8">
              <button
                onClick={() => scroll("left")}
                className="hidden md:flex h-9 w-9 rounded-full border border-gray-200 items-center justify-center bg-white hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5 text-gray-800" />
              </button>
            </div>
          )}

          {/* Scrollable nav row — overflow-x only, NOT overflow-y */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth md:px-12 items-center"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              overflowY: "visible",
            }}
          >
            {loading ? (
              <div className="flex gap-3">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-32 bg-gray-100 rounded-full animate-pulse"
                  />
                ))}
              </div>
            ) : parents.length === 0 ? (
              <div className="text-gray-500 text-sm py-2">
                No categories available
              </div>
            ) : (
              parents.map((parent) => {
                const subs = subMap[parent.id] || [];
                const parentSlug = slugOf(parent);
                const active = isParentActive(parent);
                return (
                  <div
                    key={parent.id}
                    ref={(el) => {
                      itemRefs.current[parent.id] = el;
                    }}
                    className="flex-shrink-0"
                    onMouseEnter={() => handleMouseEnter(parent.id)}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      href={`/category/${parentSlug}`}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-[#f4f6f8] text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      {parent.name}
                      {subs.length > 0 && (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            openMenu === parent.id ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown rendered OUTSIDE the overflow container, inside the relative div */}
          {openMenu && openParent && openSubs.length > 0 && (
            <div
              className="absolute top-full mt-3 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] min-w-[200px] max-w-[260px] py-2 overflow-hidden"
              style={{
                left: dropdownLeft,
                animation: "dropdownFadeIn 0.2s ease forwards",
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {openSubs.map((sub) => {
                const subSlug = toSlug(sub.name);
                const subActive = isSubActive(openParent, sub);
                return (
                  <Link
                    key={sub.id}
                    href={`/category/${openParentSlug}/${subSlug}`}
                    onClick={() => setOpenMenu(null)}
                    className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                      subActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right scroll button */}
          {!loading && parents.length > 0 && (
            <div className="absolute right-0 z-10 flex items-center h-full bg-gradient-to-l from-white via-white to-transparent pl-8">
              <button
                onClick={() => scroll("right")}
                className="hidden md:flex h-9 w-9 rounded-full border border-gray-200 items-center justify-center bg-white hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5 text-gray-800" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

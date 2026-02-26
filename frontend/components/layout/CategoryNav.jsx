"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
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
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const pathname = usePathname();

  const parents = allCategories.filter((c) => !c.parent_id);
  const subMap = allCategories.reduce((acc, c) => {
    if (c.parent_id) {
      acc[c.parent_id] = acc[c.parent_id] || [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  useEffect(() => {
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

  const handleMouseEnter = (parentId) => {
    const subs = subMap[parentId] || [];
    if (!subs.length) return;
    const el = itemRefs.current[parentId];
    const container = scrollContainerRef.current;
    if (el && container) {
      // Position dropdown relative to the outer `relative` div
      const left = el.offsetLeft - container.scrollLeft + container.offsetLeft;
      setDropdownLeft(left);
    }
    setOpenMenu(parentId);
  };

  const isParentActive = (parent) =>
    pathname.startsWith(`/category/${toSlug(parent.name)}`);

  const isSubActive = (parent, sub) =>
    pathname === `/category/${toSlug(parent.name)}/${toSlug(sub.name)}`;

  const openParent = parents.find((p) => p.id === openMenu);
  const openSubs = openParent ? subMap[openParent.id] || [] : [];
  const openParentSlug = openParent ? toSlug(openParent.name) : "";

  return (
    // overflow-visible on the sticky bar so the dropdown escapes it
    <div className="bg-white border-b border-gray-100 sticky top-20 z-40 overflow-visible">
      <div className="max-w-7xl mx-auto px-6">
        {/* Outer wrapper: position:relative is the dropdown's anchor */}
        <div
          className="relative flex items-center h-14"
          onMouseLeave={() => setOpenMenu(null)}
        >
          {/* Left scroll button */}
          {!loading && parents.length > 0 && (
            <button
              onClick={() => scroll("left")}
              className="hidden md:flex absolute left-0 z-10 h-14 w-10 items-center justify-center bg-white hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
          )}

          {/* Scrollable nav row — overflow-x only, NOT overflow-y */}
          <div
            ref={scrollContainerRef}
            className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth md:pl-12 md:pr-12"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              overflowY: "visible",
            }}
          >
            {loading ? (
              <div className="flex gap-6 py-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-5 w-28 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : parents.length === 0 ? (
              <div className="text-gray-500 text-sm py-4">
                No categories available
              </div>
            ) : (
              parents.map((parent) => {
                const subs = subMap[parent.id] || [];
                const parentSlug = toSlug(parent.name);
                const active = isParentActive(parent);
                return (
                  <div
                    key={parent.id}
                    ref={(el) => {
                      itemRefs.current[parent.id] = el;
                    }}
                    className="flex-shrink-0"
                    onMouseEnter={() => handleMouseEnter(parent.id)}
                  >
                    <Link
                      href={`/category/${parentSlug}`}
                      className={`flex items-center gap-1 px-3 h-14 text-[14px] font-medium whitespace-nowrap transition-all border-b-2 ${
                        active
                          ? "text-blue-600 border-blue-600"
                          : "text-gray-700 border-transparent hover:text-blue-600 hover:border-blue-400"
                      }`}
                    >
                      {parent.name}
                      {subs.length > 0 && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
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
              className="absolute top-full bg-white border border-gray-200 rounded-b-xl shadow-2xl z-[100] min-w-[200px] max-w-[260px] py-2"
              style={{ left: dropdownLeft }}
              onMouseEnter={() => setOpenMenu(openMenu)}
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
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
            <button
              onClick={() => scroll("right")}
              className="hidden md:flex absolute right-0 z-10 h-14 w-10 items-center justify-center bg-white hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

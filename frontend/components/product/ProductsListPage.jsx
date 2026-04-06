"use client";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  FireIcon,
  LockClosedIcon,
  SparklesIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ProductCard from "@/components/category/ProductCard";
import ProductCardWithVariants from "@/components/category/ProductCardWithVariants";
import { groupProductsByVariant } from "@/lib/productGrouping";
import { useLanguage } from "@/context/LanguageContext";
import Pagination from "@/components/common/Pagination";
import CustomSelect from "@/components/ui/custom-select";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const PAGE_SIZE = 20;

const DEFAULT_SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "updated", label: "Recently Updated" },
  { value: "discount", label: "Best Discount" },
];

const FALLBACK_PRICE_MIN = 0;
const FALLBACK_PRICE_MAX = 5000;

const FILTER_LABELS = {
  min_price: (v) => `Min ₹${v}`,
  max_price: (v) => `Max ₹${v}`,
  brand: (v) => `Brand: ${v}`,
  in_stock: () => "In stock",
  has_discount: () => "Discounted",
  is_featured: () => "Featured",
};

const HEADER_THEMES = {
  featured: {
    badge: "Featured picks",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeRing: "ring-amber-200",
    Icon: StarIcon,
  },
  deals: {
    badge: "Hot deals",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    badgeRing: "ring-orange-200",
    Icon: FireIcon,
  },
  new: {
    badge: "Just in",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    badgeRing: "ring-purple-200",
    Icon: SparklesIcon,
  },
  updated: {
    badge: "Price updates",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    badgeRing: "ring-sky-200",
    Icon: ArrowPathIcon,
  },
};

export function ProductsListPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse mb-5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(PAGE_SIZE)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl animate-pulse h-64" />
        ))}
      </div>
    </div>
  );
}

function FiltersPanel({
  priceBounds,
  priceRange,
  setPriceRange,
  onPriceApply,
  inStockOnly,
  onToggleInStock,
  hasDiscount,
  onToggleDiscount,
  disableInStock,
  disableDiscount,
  brands,
  selectedBrands,
  onToggleBrand,
  onClear,
  showHeader = true,
}) {
  const range = Math.max(1, priceBounds.max - priceBounds.min);
  const step = Math.max(10, Math.round(range / 40 / 10) * 10);
  const minGap = Math.max(step, 10);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {showHeader && (
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClear}
            className="text-xs font-medium text-[#16A34A] hover:text-[#14532d] hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Price Range</h4>
            <span className="text-xs font-semibold text-[#166534]">
              ₹{priceRange[0].toLocaleString()} - ₹
              {priceRange[1].toLocaleString()}
            </span>
          </div>

          <div className="relative h-6 flex items-center">
            <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
            <div
              className="absolute h-1.5 bg-[#16A34A] rounded-full pointer-events-none"
              style={{
                left: `${((priceRange[0] - priceBounds.min) / range) * 100}%`,
                right: `${100 - ((priceRange[1] - priceBounds.min) / range) * 100}%`,
              }}
            />
            <div
              className="absolute w-4 h-4 bg-white border-2 border-[#16A34A] rounded-full shadow-md pointer-events-none"
              style={{
                left: `calc(${((priceRange[0] - priceBounds.min) / range) * 100}% - 8px)`,
                zIndex: 10,
              }}
            />
            <div
              className="absolute w-4 h-4 bg-white border-2 border-[#16A34A] rounded-full shadow-md pointer-events-none"
              style={{
                left: `calc(${((priceRange[1] - priceBounds.min) / range) * 100}% - 8px)`,
                zIndex: 10,
              }}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={step}
              value={priceRange[0]}
              onChange={(e) => {
                const val = Math.min(
                  Number(e.target.value),
                  priceRange[1] - minGap,
                );
                const nextRange = [val, priceRange[1]];
                setPriceRange(nextRange);
                onPriceApply(nextRange);
              }}
              className="absolute w-full h-full opacity-0 cursor-pointer"
              style={{
                zIndex:
                  priceRange[0] > priceBounds.max - minGap ? 5 : 3,
              }}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={step}
              value={priceRange[1]}
              onChange={(e) => {
                const val = Math.max(
                  Number(e.target.value),
                  priceRange[0] + minGap,
                );
                const nextRange = [priceRange[0], val];
                setPriceRange(nextRange);
                onPriceApply(nextRange);
              }}
              className="absolute w-full h-full opacity-0 cursor-pointer"
              style={{ zIndex: 4 }}
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">
              ₹{priceBounds.min.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400">
              ₹{priceBounds.max.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={onToggleInStock}
              disabled={disableInStock}
              className="w-4 h-4 text-[#16A34A] border-gray-300 rounded focus:ring-[#22c55e]/40 cursor-pointer disabled:opacity-60"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              In Stock Only
            </span>
            {disableInStock && (
              <span className="text-[11px] text-gray-400">Locked</span>
            )}
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasDiscount}
              onChange={onToggleDiscount}
              disabled={disableDiscount}
              className="w-4 h-4 text-[#16A34A] border-gray-300 rounded focus:ring-[#22c55e]/40 cursor-pointer disabled:opacity-60"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              Discounted Items
            </span>
            {disableDiscount && (
              <span className="text-[11px] text-gray-400">Locked</span>
            )}
          </label>
        </div>

        {brands.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Brands</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {brands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => onToggleBrand(brand)}
                    className="w-4 h-4 text-[#16A34A] border-gray-300 rounded focus:ring-[#22c55e]/40 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors line-clamp-1">
                    {brand}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsListPage({
  title,
  subtitle,
  headerTheme = null,
  shuffleOnDefault = false,
  defaultSort = "",
  fixedParams = {},
  sortOptions = DEFAULT_SORT_OPTIONS,
  hideSort = false,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLanguage();
  const searchParamsString = searchParams.toString();
  const fixedParamsKey = useMemo(() => {
    const entries = Object.entries(fixedParams || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  }, [fixedParams]);
  const stableFixedParams = useMemo(() => {
    if (!fixedParamsKey) return {};
    const entries = JSON.parse(fixedParamsKey);
    return Object.fromEntries(entries);
  }, [fixedParamsKey]);

  const sortParam = searchParams.get("sort");
  const sort = sortParam ?? defaultSort;
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1"));

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(pageParam);
  const [activeSort, setActiveSort] = useState(sort);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [priceBounds, setPriceBounds] = useState({
    min: FALLBACK_PRICE_MIN,
    max: FALLBACK_PRICE_MAX,
  });
  const [priceRange, setPriceRange] = useState([
    FALLBACK_PRICE_MIN,
    FALLBACK_PRICE_MAX,
  ]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);

  const isDiscountLocked =
    stableFixedParams.has_discount === "true" ||
    stableFixedParams.has_discount === true;
  const isInStockLocked =
    stableFixedParams.in_stock === "true" ||
    stableFixedParams.in_stock === true;
  const isFeaturedLocked =
    stableFixedParams.is_featured === "true" ||
    stableFixedParams.is_featured === true;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rawPriceBounds = useMemo(() => {
    const prices = products
      .map((product) => {
        const raw = product?.price ?? product?.mrp ?? 0;
        return Number(raw);
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!prices.length) {
      return {
        min: FALLBACK_PRICE_MIN,
        max: FALLBACK_PRICE_MAX,
      };
    }

    const min = Math.floor(Math.min(...prices) / 10) * 10;
    const max = Math.ceil(Math.max(...prices) / 10) * 10;
    const safeMax = Math.max(max, min + 50);

    return {
      min: Math.max(FALLBACK_PRICE_MIN, min),
      max: safeMax,
    };
  }, [products]);

  const stableBoundsReady = useRef(false);
  const priceApplyTimer = useRef(null);

  useEffect(() => {
    if (!rawPriceBounds) return;
    setPriceBounds((prev) => {
      if (!stableBoundsReady.current) {
        stableBoundsReady.current = true;
        return rawPriceBounds;
      }

      return {
        min: Math.min(prev.min, rawPriceBounds.min),
        max: Math.max(prev.max, rawPriceBounds.max),
      };
    });
  }, [rawPriceBounds]);

  useEffect(() => {
    setPage(pageParam);
  }, [pageParam]);

  useEffect(() => {
    setActiveSort(sort);
  }, [sort]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const minPriceParam = Number.parseInt(
      params.get("min_price") || "",
      10,
    );
    const maxPriceParam = Number.parseInt(
      params.get("max_price") || "",
      10,
    );
    const resolvedMin = Number.isFinite(minPriceParam)
      ? minPriceParam
      : priceBounds.min;
    const resolvedMax = Number.isFinite(maxPriceParam)
      ? maxPriceParam
      : priceBounds.max;
    const clampedMin = Math.min(
      Math.max(resolvedMin, priceBounds.min),
      priceBounds.max,
    );
    const clampedMax = Math.max(
      Math.min(resolvedMax, priceBounds.max),
      priceBounds.min,
    );
    const normalizedMin = Math.min(clampedMin, clampedMax);
    const normalizedMax = Math.max(clampedMin, clampedMax);

    setPriceRange([normalizedMin, normalizedMax]);

    const brandParam = params.get("brand");
    setSelectedBrands(brandParam ? brandParam.split(",") : []);

    setInStockOnly(
      isInStockLocked ? true : params.get("in_stock") === "true",
    );
    setHasDiscount(
      isDiscountLocked ? true : params.get("has_discount") === "true",
    );
  }, [searchParamsString, isInStockLocked, isDiscountLocked, priceBounds]);

  const fetchProducts = useCallback(
    async (pageNum, sortVal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const activeParams = new URLSearchParams(searchParamsString);
        params.set("limit", PAGE_SIZE);
        params.set("page", pageNum);
        params.set("is_active", "true");
        params.set("lang", lang);

        Object.entries(stableFixedParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
          }
        });

        const minPrice = activeParams.get("min_price");
        const maxPrice = activeParams.get("max_price");
        const brandParam = activeParams.get("brand");
        const inStockParam = activeParams.get("in_stock");
        const discountParam = activeParams.get("has_discount");

        if (minPrice) params.set("min_price", minPrice);
        if (maxPrice) params.set("max_price", maxPrice);
        if (brandParam) params.set("brand", brandParam);
        if (inStockParam === "true") params.set("in_stock", "true");
        if (discountParam === "true") params.set("has_discount", "true");

        if (sortVal === "price_asc") {
          params.set("sort_by", "price");
          params.set("sort_order", "asc");
        } else if (sortVal === "price_desc") {
          params.set("sort_by", "price");
          params.set("sort_order", "desc");
        } else if (sortVal === "newest") {
          params.set("sort_by", "created_at");
          params.set("sort_order", "desc");
        } else if (sortVal === "updated") {
          params.set("sort_by", "updated_at");
          params.set("sort_order", "desc");
        } else if (sortVal === "discount") {
          params.set("has_discount", "true");
        }

        const res = await fetch(
          `${API_URL}/products?${params.toString()}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        setProducts(json.data || []);
        setTotal(
          json.pagination?.totalItems ||
            json.pagination?.total ||
            (json.data || []).length,
        );
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [lang, stableFixedParams, fixedParamsKey, searchParamsString],
  );

  useEffect(() => {
    fetchProducts(page, activeSort);
  }, [page, activeSort, fetchProducts]);

  const handleSort = (value) => {
    setActiveSort(value);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    params.delete("page");
    applyFixedParams(params);
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`,
      { scroll: false },
    );
  };

  const handlePageChange = (p) => {
    setPage(p);
    const params = new URLSearchParams(searchParams.toString());
    if (activeSort) params.set("sort", activeSort);
    else params.delete("sort");
    if (p > 1) params.set("page", p);
    else params.delete("page");
    applyFixedParams(params);
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`,
      { scroll: true },
    );
  };

  const scrollKey = useMemo(
    () => `${pathname}?${searchParamsString}`,
    [pathname, searchParamsString],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(`scroll:${scrollKey}`);
    if (!saved) return;
    const y = Number(saved);
    if (!Number.isFinite(y) || y <= 0) return;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [scrollKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(
          `scroll:${scrollKey}`,
          String(window.scrollY || 0),
        );
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollKey]);

  const availableBrands = useMemo(() => {
    const unique = new Set();
    products.forEach((product) => {
      if (product?.brand) unique.add(product.brand);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const productGroups = useMemo(
    () => groupProductsByVariant(products),
    [products],
  );

  const hasActiveFilterParams = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const keys = [
      "min_price",
      "max_price",
      "brand",
      "in_stock",
      "has_discount",
    ];
    return keys.some((key) => params.get(key));
  }, [searchParamsString]);

  const shouldShuffle =
    shuffleOnDefault && !searchParams.get("sort") && !hasActiveFilterParams;

  const displayGroups = useMemo(() => {
    if (!shouldShuffle) return productGroups;

    const shuffled = [...productGroups];
    const now = new Date();
    const seed =
      (now.getFullYear() * 10000 +
        (now.getMonth() + 1) * 100 +
        now.getDate()) >>>
      0;

    let s = seed || 1;
    const next = () => {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [productGroups, shouldShuffle]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlow =
      connection?.saveData ||
      ["slow-2g", "2g"].includes(connection?.effectiveType);
    if (isSlow) return;

    const ids = displayGroups
      .map((group) => group?.variants?.[0]?.id)
      .filter(Boolean)
      .slice(0, 3);

    ids.forEach((id) => {
      router.prefetch(`/products/${id}`);
    });

    if (totalPages > page) {
      const params = new URLSearchParams(searchParamsString);
      params.set("page", String(page + 1));
      if (activeSort) params.set("sort", activeSort);
      applyFixedParams(params);
      router.prefetch(`${pathname}?${params.toString()}`);
    }
  }, [displayGroups, page, totalPages, activeSort, searchParamsString, pathname, router]);

  const applyFixedParams = (params) => {
    Object.entries(stableFixedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  };

  const applyFilters = useCallback((newFilters) => {
    const params = new URLSearchParams(searchParamsString);

    if (newFilters.priceRange) {
      if (newFilters.priceRange[0] > priceBounds.min)
        params.set("min_price", newFilters.priceRange[0]);
      else params.delete("min_price");

      if (newFilters.priceRange[1] < priceBounds.max)
        params.set("max_price", newFilters.priceRange[1]);
      else params.delete("max_price");
    }

    if (newFilters.brands !== undefined) {
      if (newFilters.brands.length > 0)
        params.set("brand", newFilters.brands.join(","));
      else params.delete("brand");
    }

    if (newFilters.inStock !== undefined) {
      if (newFilters.inStock) params.set("in_stock", "true");
      else params.delete("in_stock");
    }

    if (newFilters.hasDiscount !== undefined) {
      if (newFilters.hasDiscount) params.set("has_discount", "true");
      else params.delete("has_discount");
    }

    params.delete("page");
    applyFixedParams(params);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParamsString, priceBounds, stableFixedParams, fixedParamsKey, pathname, router]);

  const queuePriceApply = useCallback(
    (nextRange, options = {}) => {
      if (!nextRange) return;
      if (priceApplyTimer.current) {
        clearTimeout(priceApplyTimer.current);
      }
      if (options.immediate) {
        applyFilters({ priceRange: nextRange });
        return;
      }
      priceApplyTimer.current = setTimeout(() => {
        applyFilters({ priceRange: nextRange });
      }, 200);
    },
    [applyFilters],
  );

  useEffect(() => {
    return () => {
      if (priceApplyTimer.current) {
        clearTimeout(priceApplyTimer.current);
      }
    };
  }, []);

  const handlePriceApply = (nextRange, options) => {
    const range = nextRange || priceRange;
    if (!range) return;
    queuePriceApply(range, options);
  };

  const handleBrandToggle = (brand) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(newBrands);
    applyFilters({ brands: newBrands });
  };

  const handleInStockToggle = () => {
    if (isInStockLocked) return;
    const next = !inStockOnly;
    setInStockOnly(next);
    applyFilters({ inStock: next });
  };

  const handleDiscountToggle = () => {
    if (isDiscountLocked) return;
    const next = !hasDiscount;
    setHasDiscount(next);
    applyFilters({ hasDiscount: next });
  };

  const clearFilters = () => {
    if (priceApplyTimer.current) {
      clearTimeout(priceApplyTimer.current);
    }
    setPriceRange([priceBounds.min, priceBounds.max]);
    setSelectedBrands([]);
    if (!isInStockLocked) setInStockOnly(false);
    if (!isDiscountLocked) setHasDiscount(false);

    const params = new URLSearchParams(searchParams.toString());
    [
      "min_price",
      "max_price",
      "brand",
      "in_stock",
      "has_discount",
      "is_featured",
    ].forEach((key) => params.delete(key));
    params.delete("page");
    applyFixedParams(params);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeFilters = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const items = [];

    const minPrice = params.get("min_price");
    const maxPrice = params.get("max_price");
    const brandParam = params.get("brand");

    if (minPrice) items.push({ key: "min_price", label: FILTER_LABELS.min_price(minPrice), locked: false });
    if (maxPrice) items.push({ key: "max_price", label: FILTER_LABELS.max_price(maxPrice), locked: false });
    if (brandParam) {
      brandParam.split(",").forEach((brand) => {
        items.push({ key: "brand", label: FILTER_LABELS.brand(brand), locked: false, value: brand });
      });
    }

    const inStockActive = isInStockLocked || params.get("in_stock") === "true";
    const discountActive = isDiscountLocked || params.get("has_discount") === "true";
    const featuredActive = isFeaturedLocked || params.get("is_featured") === "true";

    if (inStockActive)
      items.push({ key: "in_stock", label: FILTER_LABELS.in_stock(), locked: isInStockLocked });
    if (discountActive)
      items.push({ key: "has_discount", label: FILTER_LABELS.has_discount(), locked: isDiscountLocked });
    if (featuredActive)
      items.push({ key: "is_featured", label: FILTER_LABELS.is_featured(), locked: isFeaturedLocked });

    return items;
  }, [searchParamsString, isInStockLocked, isDiscountLocked, isFeaturedLocked]);

  const quickPriceSteps = useMemo(() => {
    const span = Math.max(1, priceBounds.max - priceBounds.min);
    const stepA = Math.round((priceBounds.min + span * 0.25) / 10) * 10;
    const stepB = Math.round((priceBounds.min + span * 0.5) / 10) * 10;
    const steps = [stepA, stepB]
      .filter((value) => value > priceBounds.min && value < priceBounds.max)
      .filter((value, index, arr) => arr.indexOf(value) === index);
    return steps;
  }, [priceBounds]);

  const applyQuickPrice = (limit) => {
    const nextRange = [priceBounds.min, limit];
    setPriceRange(nextRange);
    handlePriceApply(nextRange, { immediate: true });
  };

  const theme = headerTheme ? HEADER_THEMES[headerTheme] : null;

  const removeFilter = (key, value, locked) => {
    if (locked) return;
    const params = new URLSearchParams(searchParams.toString());

    if (key === "brand") {
      const brands = (params.get("brand") || "")
        .split(",")
        .filter(Boolean)
        .filter((b) => b !== value);
      if (brands.length) params.set("brand", brands.join(","));
      else params.delete("brand");
    } else {
      params.delete(key);
    }

    params.delete("page");
    applyFixedParams(params);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <nav
        aria-label="Breadcrumb"
        className="mb-2 flex items-center gap-2 text-xs text-gray-500 sm:hidden"
      >
        <Link href="/" className="hover:text-gray-700">
          Home
        </Link>
        <span className="text-gray-300">&gt;</span>
        <span className="text-gray-700 font-semibold">{title}</span>
      </nav>

      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <div>
          {theme && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${theme.badgeBg} ${theme.badgeText} ${theme.badgeRing}`}
            >
              <theme.Icon className="w-3.5 h-3.5" />
              {theme.badge}
            </span>
          )}
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-0.5 max-w-[60ch]">
              {subtitle}
            </p>
          )}
          {loading ? (
            <div className="mt-1 h-4 w-40 bg-gray-100 rounded-full animate-pulse" />
          ) : (
            <p className="text-sm text-gray-400 mt-0.5">
              {total.toLocaleString()} product{total !== 1 ? "s" : ""}
              {totalPages > 1 && (
                <span className="ml-1">
                  - page {page} of {totalPages}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
            Filters
            {activeFilters.length > 0 && (
              <span className="ml-0.5 bg-[#16A34A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          {!hideSort && sortOptions.length > 0 && (
            <div className="relative">
              <div className="flex items-center gap-1.5 h-10 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl px-4 select-none hover:border-gray-300 transition-colors">
                <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
                <CustomSelect
                  value={activeSort}
                  onChange={handleSort}
                  options={sortOptions}
                  buttonClassName="border-0 bg-transparent px-0 py-0 min-w-0 shadow-none focus:ring-0 hover:border-0"
                  contentClassName="min-w-[220px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-14 z-20 -mx-4 px-4 pt-2 pb-3 bg-[#F7F7F7] md:static md:mx-0 md:px-0 md:pt-0 md:pb-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Quick filters:
          </span>
          <button
            type="button"
            onClick={handleInStockToggle}
            disabled={isInStockLocked}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              inStockOnly || isInStockLocked
                ? "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            } ${isInStockLocked ? "opacity-70" : ""}`}
          >
            In stock
            {isInStockLocked && <LockClosedIcon className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleDiscountToggle}
            disabled={isDiscountLocked}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              hasDiscount || isDiscountLocked
                ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            } ${isDiscountLocked ? "opacity-70" : ""}`}
          >
            Discounted
            {isDiscountLocked && <LockClosedIcon className="w-3 h-3" />}
          </button>
          {quickPriceSteps.map((limit) => (
            <button
              key={limit}
              type="button"
              onClick={() => applyQuickPrice(limit)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                priceRange[0] === priceBounds.min && priceRange[1] === limit
                  ? "bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Under ₹{limit.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[32px] flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-gray-600 font-semibold">
          Active filters:
        </span>
        {activeFilters.length === 0 && (
          <span className="text-xs text-gray-400">None</span>
        )}
        {activeFilters.map(({ key, label, locked, value }) =>
          locked ? (
            <span
              key={`${key}-${label}`}
              className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-500 border border-dashed border-gray-200 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {label}
              <LockClosedIcon className="w-3 h-3" />
            </span>
          ) : (
            <button
              key={`${key}-${label}`}
              onClick={() => removeFilter(key, value, locked)}
              className="inline-flex items-center gap-1.5 bg-[#16A34A]/10 text-[#166534] border border-[#bbf7d0] text-xs font-medium px-2.5 py-1 rounded-full hover:bg-[#dcfce7] transition-colors"
            >
              {label}
              <XMarkIcon className="w-3 h-3" />
            </button>
          ),
        )}
        {activeFilters.some((item) => !item.locked) && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-[#b91c1c] underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <FiltersPanel
            priceBounds={priceBounds}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onPriceApply={handlePriceApply}
            inStockOnly={inStockOnly}
            onToggleInStock={handleInStockToggle}
            hasDiscount={hasDiscount}
            onToggleDiscount={handleDiscountToggle}
            disableInStock={isInStockLocked}
            disableDiscount={isDiscountLocked}
            brands={availableBrands}
            selectedBrands={selectedBrands}
            onToggleBrand={handleBrandToggle}
            onClear={clearFilters}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 rounded-xl animate-pulse h-64"
                />
              ))}
            </div>
          ) : displayGroups.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center">
              <p className="text-lg font-semibold text-gray-700">
                No products found
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Try a different filter or sort option.
              </p>
              {activeFilters.some((item) => !item.locked) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center rounded-xl bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#15803d] transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayGroups.map((group, idx) =>
                  group.variants.length > 1 ? (
                    <ProductCardWithVariants
                      key={`${group.name}-${idx}`}
                      variants={group.variants}
                    />
                  ) : (
                    <ProductCard
                      key={group.variants[0].id}
                      product={group.variants[0]}
                    />
                  ),
                )}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FiltersPanel
                priceBounds={priceBounds}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                onPriceApply={handlePriceApply}
                inStockOnly={inStockOnly}
                onToggleInStock={handleInStockToggle}
                hasDiscount={hasDiscount}
                onToggleDiscount={handleDiscountToggle}
                disableInStock={isInStockLocked}
                disableDiscount={isDiscountLocked}
                brands={availableBrands}
                selectedBrands={selectedBrands}
                onToggleBrand={handleBrandToggle}
                onClear={clearFilters}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

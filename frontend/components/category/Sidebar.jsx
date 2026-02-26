"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import ImageWithFallback from "../common/ImageWithFallback";

export default function Sidebar({
  mainCategory,
  subcategories,
  activeSubcategory,
  isMobileOpen,
  onCloseMobile,
  brands = [],
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isSubcategoriesOpen, setIsSubcategoriesOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Filter states
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);

  // Initialize filters from URL
  useEffect(() => {
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    if (minPrice || maxPrice) {
      setPriceRange([
        minPrice ? parseInt(minPrice) : 0,
        maxPrice ? parseInt(maxPrice) : 5000,
      ]);
    }

    const brandParam = searchParams.get("brand");
    if (brandParam) setSelectedBrands(brandParam.split(","));

    setInStockOnly(searchParams.get("in_stock") === "true");
    setHasDiscount(searchParams.get("has_discount") === "true");
  }, [searchParams]);

  const applyFilters = (newFilters) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilters.priceRange) {
      if (newFilters.priceRange[0] > 0)
        params.set("min_price", newFilters.priceRange[0]);
      else params.delete("min_price");

      if (newFilters.priceRange[1] < 5000)
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

    // Reset to page 1 when filtering
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePriceApply = () => {
    applyFilters({ priceRange });
  };

  const handleBrandToggle = (brand) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(newBrands);
    applyFilters({ brands: newBrands });
  };

  const clearFilters = () => {
    setPriceRange([0, 5000]);
    setSelectedBrands([]);
    setInStockOnly(false);
    setHasDiscount(false);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("min_price");
    params.delete("max_price");
    params.delete("brand");
    params.delete("in_stock");
    params.delete("has_discount");
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  };

  const generateSlug = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          Filters & Categories
        </h2>
        <button
          onClick={onCloseMobile}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-0 space-y-8">
        {/* Subcategories Section */}
        {subcategories?.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setIsSubcategoriesOpen(!isSubcategoriesOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Categories</h3>
              {isSubcategoriesOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isSubcategoriesOpen && (
              <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {subcategories.map((sub) => {
                  const isActive = activeSubcategory?.id === sub.id;
                  return (
                    <Link
                      key={sub.id}
                      href={`/category/${generateSlug(mainCategory.name)}/${generateSlug(sub.name)}`}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 mt-1 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 ${isActive ? "scale-110 ring-2 ring-blue-200" : "bg-gray-100"}`}
                      >
                        {sub.image_url ? (
                          <ImageWithFallback
                            src={sub.image_url}
                            alt={sub.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            {sub.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm line-clamp-2">{sub.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filters Section */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Price Range — dual range slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Price Range
                </h4>
                <span className="text-xs font-semibold text-blue-600">
                  ₹{priceRange[0].toLocaleString()} – ₹
                  {priceRange[1].toLocaleString()}
                </span>
              </div>

              {/* Slider track */}
              <div className="relative h-6 flex items-center">
                {/* Grey track */}
                <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
                {/* Blue selected track */}
                <div
                  className="absolute h-1.5 bg-blue-500 rounded-full pointer-events-none"
                  style={{
                    left: `${(priceRange[0] / 5000) * 100}%`,
                    right: `${100 - (priceRange[1] / 5000) * 100}%`,
                  }}
                />
                {/* Min thumb visual */}
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md pointer-events-none"
                  style={{
                    left: `calc(${(priceRange[0] / 5000) * 100}% - 8px)`,
                    zIndex: 10,
                  }}
                />
                {/* Max thumb visual */}
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md pointer-events-none"
                  style={{
                    left: `calc(${(priceRange[1] / 5000) * 100}% - 8px)`,
                    zIndex: 10,
                  }}
                />
                {/* Invisible min range input */}
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={priceRange[0]}
                  onChange={(e) => {
                    const val = Math.min(
                      Number(e.target.value),
                      priceRange[1] - 50,
                    );
                    setPriceRange([val, priceRange[1]]);
                  }}
                  onMouseUp={handlePriceApply}
                  onTouchEnd={handlePriceApply}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                  style={{ zIndex: priceRange[0] > 4800 ? 5 : 3 }}
                />
                {/* Invisible max range input */}
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={priceRange[1]}
                  onChange={(e) => {
                    const val = Math.max(
                      Number(e.target.value),
                      priceRange[0] + 50,
                    );
                    setPriceRange([priceRange[0], val]);
                  }}
                  onMouseUp={handlePriceApply}
                  onTouchEnd={handlePriceApply}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                  style={{ zIndex: 4 }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">₹0</span>
                <span className="text-[10px] text-gray-400">₹5,000</span>
              </div>
            </div>

            {/* Availability & Discount */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                      applyFilters({ inStock: e.target.checked });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  In Stock Only
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={hasDiscount}
                    onChange={(e) => {
                      setHasDiscount(e.target.checked);
                      applyFilters({ hasDiscount: e.target.checked });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  Discounted Items
                </span>
              </label>
            </div>

            {/* Brands */}
            {brands.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Brands
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {brands.map((brand) => (
                    <label
                      key={brand}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => handleBrandToggle(brand)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
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
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar pb-8">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-[280px] bg-white z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } shadow-2xl`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

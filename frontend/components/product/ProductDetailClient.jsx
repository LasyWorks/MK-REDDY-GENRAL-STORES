"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCartIcon as ShoppingCart,
  PlusIcon as Plus,
  MinusIcon as Minus,
  ChevronRightIcon as ChevronRight,
  CubeIcon as Package,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle2,
  ShareIcon as Share2,
  MapPinIcon as MapPin,
  BoltIcon as Zap,
  TagIcon as Tag,
  ShieldCheckIcon as ShieldCheck,
  TruckIcon as Truck,
  ArrowPathIcon as RotateCcw,
  ArrowLeftIcon as ArrowLeft,
  MagnifyingGlassIcon as MagnifyingGlass,
} from "@heroicons/react/24/outline";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/category/ProductCard";
import ProductImages from "./ProductImages";
import WishlistButton from "./WishlistButton";
import StickyCartBar from "./StickyCartBar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

function variantLabel(v) {
  return v.unit_pack_size || v.variant || `₹${parseFloat(v.price).toFixed(0)}`;
}

/* -- Inline star row -- */
function StarRow({ value = 0, count = 0 }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => {
          const filled = rounded >= s;
          const half = !filled && rounded >= s - 0.5;
          return (
            <span key={s} className="relative w-4 h-4 inline-block">
              <svg
                className="absolute inset-0 w-4 h-4 text-gray-200"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {(filled || half) && (
                <span
                  className="absolute inset-0 overflow-hidden text-yellow-400"
                  style={{ width: half ? "50%" : "100%" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-gray-800">
        {value > 0 ? value.toFixed(1) : ""}
      </span>
      {count > 0 && (
        <a href="#reviews" className="text-sm text-blue-600 hover:underline">
          ({count.toLocaleString()} {count === 1 ? "review" : "reviews"})
        </a>
      )}
    </div>
  );
}

/* -- Key highlights -- */
function KeyHighlights({ description, highlights }) {
  const items = highlights?.length
    ? highlights
    : description
      ? description
          .split(/[.\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8 && s.length < 120)
          .slice(0, 5)
      : [];
  if (!items.length) return null;
  return (
    <div className="pt-4 border-t border-gray-100">
      <h3 className="text-sm font-bold text-gray-800 mb-2">Key Highlights</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="mt-0.5 w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -- Delivery info -- */
function DeliveryInfo() {
  return (
    <div className="bg-blue-50 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-gray-600">
          Deliver to <span className="font-semibold text-gray-900">533001</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Zap className="w-4 h-4 text-green-600 shrink-0" />
        <span className="font-semibold text-green-700">
          Delivery in 20 mins
        </span>
      </div>
    </div>
  );
}

/* -- Trust badges (#8) -- */
function TrustBadges() {
  const badges = [
    {
      icon: ShieldCheck,
      label: "100% Genuine Product",
      color: "text-green-600",
    },
    { icon: Truck, label: "Fast Delivery", color: "text-blue-600" },
    { icon: RotateCcw, label: "Easy Returns", color: "text-orange-500" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 py-3 border-t border-gray-100">
      {badges.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-1.5 text-sm text-gray-600"
        >
          <b.icon className={`w-4 h-4 ${b.color} shrink-0`} />
          <span className="font-medium">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
export default function ProductDetailClient({
  product,
  variants: initialVariants,
}) {
  const { lang } = useLanguage();
  const { items, addItem, updateQty, openCart, totalCount } = useCart();
  const sentinelRef = useRef(null);
  const router = useRouter();
  const [descExpanded, setDescExpanded] = useState(false);

  const [localProduct, setLocalProduct] = useState(product);
  const [localVariants, setLocalVariants] = useState(initialVariants);
  const [selectedId, setSelectedId] = useState(product.id);
  const [related, setRelated] = useState([]);
  const [peopleAlsoBought, setPeopleAlsoBought] = useState([]);
  const [relatedCatName, setRelatedCatName] = useState("");
  const [relatedCatId, setRelatedCatId] = useState("");
  const [fading, setFading] = useState(false);
  const [zoomData, setZoomData] = useState({
    isZoomed: false,
    image: null,
    position: { x: 50, y: 50 },
  });
  const [galleryImages, setGalleryImages] = useState(() => {
    const imgs = product.image_urls?.length
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];
    return imgs;
  });

  /* -- Re-fetch on lang change -- */
  useEffect(() => {
    let cancelled = false;
    async function refetch() {
      try {
        const res = await fetch(
          `${API_URL}/products/${product.id}?lang=${lang}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const prod = json.data;
        if (!prod) return;
        setLocalProduct(prod);

        // Prefer explicit variant group (parent_product_id-based) returned by API
        if (prod.variants && prod.variants.length > 1) {
          setLocalVariants(prod.variants);
        } else if (prod.brand) {
          // Fallback: group by brand+category for legacy products
          const vRes = await fetch(
            `${API_URL}/products?brand=${encodeURIComponent(prod.brand)}&category_id=${prod.category_id}&limit=50&is_active=true&lang=${lang}`,
            { cache: "no-store" },
          );
          if (!vRes.ok || cancelled) return;
          const vJson = await vRes.json();
          const vs = vJson.data || [];
          setLocalVariants(vs.length > 0 ? vs : [prod]);
        } else {
          setLocalVariants([prod]);
        }
      } catch {}
    }
    refetch();
    return () => {
      cancelled = true;
    };
  }, [lang, product.id, product.brand, product.category_id]);

  /* -- Related products -- */
  useEffect(() => {
    let cancelled = false;
    async function fetchRelated() {
      try {
        const parentId =
          localProduct.category_parent_id || product.category_parent_id;
        const catName = parentId
          ? localProduct.parent_category_name ||
            product.parent_category_name ||
            ""
          : localProduct.category_name || product.category_name || "";
        const param = parentId
          ? `parent_category_id=${parentId}`
          : `category_id=${product.category_id}`;
        const res = await fetch(
          `${API_URL}/products?${param}&limit=24&is_active=true&lang=${lang}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) {
          console.log("Related products fetch failed:", res.status);
          return;
        }
        const json = await res.json();
        const all = json.data || [];
        console.log("Related products fetched:", all.length);
        const filtered = all.filter(
          (p) =>
            p.id !== product.id &&
            (!product.brand ||
              !p.brand ||
              p.brand.toLowerCase() !== product.brand.toLowerCase()),
        );
        if (!cancelled) {
          console.log("Setting related products:", filtered.length);
          setRelated(filtered.slice(0, 8));
          setRelatedCatName(catName);
          setRelatedCatId(parentId || product.category_id);
        }
      } catch (err) {
        console.error("Related products error:", err);
      }
    }
    fetchRelated();
    return () => {
      cancelled = true;
    };
  }, [
    lang,
    product.id,
    product.category_id,
    product.brand,
    localProduct.category_parent_id,
  ]);

  /* -- People also bought (frequently bought together) -- */
  useEffect(() => {
    let cancelled = false;
    async function fetchPeopleAlsoBought() {
      try {
        const url = `${API_URL}/products/${product.id}/frequently-bought-together?lang=${lang}&limit=12`;
        console.log("Fetching people also bought:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) {
          console.log("People also bought fetch failed:", res.status);
          return;
        }
        const json = await res.json();
        const items = json.data || [];
        console.log("People also bought fetched:", items.length, items);
        if (!cancelled) {
          setPeopleAlsoBought(items);
        }
      } catch (err) {
        console.error("People also bought error:", err);
      }
    }
    fetchPeopleAlsoBought();
    return () => {
      cancelled = true;
    };
  }, [lang, product.id]);

  useEffect(() => {
    setSelectedId(product.id);
  }, [product.id]);

  /* -- Derived state (must come BEFORE effects that use `selected`) -- */
  const selected =
    localVariants.find((v) => v.id === selectedId) || localProduct;
  const price = parseFloat(selected.price || 0);
  const mrp = parseFloat(selected.mrp || price);
  const hasDiscount = mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = hasDiscount ? (mrp - price).toFixed(2) : 0;
  const isOutOfStock = (selected.stock_quantity ?? 0) <= 0;
  const cartItem = items.find((i) => i.id === selected.id);
  const qty = cartItem?.quantity ?? 0;
  const hasVariants = localVariants.length > 1;
  const rating = parseFloat(selected.rating || selected.avg_rating || 0);
  const reviewCount = parseInt(
    selected.review_count || selected.ratings_count || 0,
  );

  /* -- Gallery images -- */
  const imagesForVariant = (v) =>
    v.image_urls?.length ? v.image_urls : v.image_url ? [v.image_url] : [];

  useEffect(() => {
    const base = imagesForVariant(selected);
    setGalleryImages(base);
  }, [selectedId, localProduct]);

  useEffect(() => {
    if (galleryImages.length >= 4) return;
    let cancelled = false;
    const searchName = selected.name_en || selected.name || "";
    if (!searchName) return;
    fetch(
      `/api/product-images?id=${encodeURIComponent(selected.id)}&name=${encodeURIComponent(searchName)}&brand=${encodeURIComponent(selected.brand || "")}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.urls?.length) setGalleryImages(json.urls);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected?.id, galleryImages.length]);

  const handleVariantSelect = useCallback(
    (variant) => {
      if (variant.id === selectedId) return;
      setFading(true);
      setTimeout(() => {
        setSelectedId(variant.id);
        window.history.replaceState(null, "", `/products/${variant.id}`);
        setFading(false);
      }, 120);
    },
    [selectedId],
  );

  const handleAdd = async () => {
    if (isOutOfStock) return;
    await addItem(selected, 1);
    openCart();
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    if (qty === 0) await addItem(selected, 1);
    openCart();
  };

  const mobileCardId =
    localProduct.category_parent_id ||
    product.category_parent_id ||
    product.category_id;
  const mobileCatName =
    localProduct.parent_category_name ||
    product.parent_category_name ||
    localProduct.category_name ||
    product.category_name ||
    "";

  return (
    <>
      {/* ── Mobile Sticky Navigation Header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm md:hidden">
        <div className="flex items-center px-3 h-14 gap-1">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <nav className="flex-1 min-w-0 flex items-center gap-1 text-xs text-gray-500 overflow-hidden">
            <Link href="/" className="shrink-0 hover:text-[#16A34A]">
              Home
            </Link>
            {mobileCatName && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
                <Link
                  href={`/categories/${mobileCardId}`}
                  className="truncate max-w-[80px] hover:text-[#16A34A]"
                >
                  {mobileCatName}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
            <span className="text-gray-900 font-medium truncate">
              {selected.name}
            </span>
          </nav>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0">
            <MagnifyingGlass className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={openCart}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {totalCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#16A34A] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 md:px-4 lg:px-8 pb-28 md:pb-8">
        {/* -- Breadcrumb (desktop only) -- */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm text-gray-500 mb-5 flex-wrap">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          {(localProduct.category_parent_id || product.category_parent_id) && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Link
                href={`/categories/${localProduct.category_parent_id || product.category_parent_id}`}
                className="hover:text-blue-600 whitespace-nowrap"
              >
                {localProduct.parent_category_name ||
                  product.parent_category_name}
              </Link>
            </>
          )}
          {(localProduct.category_name || selected.category_name) && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Link
                href={`/categories/${product.category_id}`}
                className="hover:text-blue-600 whitespace-nowrap"
              >
                {localProduct.category_name || selected.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-gray-900 font-medium line-clamp-1 max-w-xs">
            {selected.name}
          </span>
        </nav>

        {/* -- Sentinel for sticky bar -- */}
        <div ref={sentinelRef} className="h-px" />

        {/* -- Main card -- */}
        <div className="bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-0 relative">
            {/* � LEFT � Images (55%, sticky #9) */}
            <div className="lg:w-[55%] bg-white md:bg-gray-50 shrink-0 md:p-4 lg:p-6">
              <div className="lg:sticky lg:top-25">
                <ProductImages
                  images={galleryImages}
                  productName={selected.name}
                  isOutOfStock={isOutOfStock}
                  onZoomChange={setZoomData}
                />
              </div>
            </div>

            {/* � RIGHT � Info (45%) */}
            <div
              className={`lg:w-[45%] px-4 py-5 md:p-6 lg:p-8 flex flex-col gap-5 md:gap-4 transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"} relative`}
            >
              {/* Blinkit-style Zoom Overlay */}
              {zoomData.isZoomed && !isOutOfStock && (
                <div className="hidden lg:block absolute inset-0 z-50 bg-white border-l-2 border-blue-500 shadow-2xl overflow-hidden pointer-events-none">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${zoomData.image})`,
                      backgroundSize: "180%",
                      backgroundPosition: `${zoomData.position.x}% ${zoomData.position.y}%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>
              )}

              {/* Brand + Title + Wishlist inline */}
              <div>
                {selected.brand && (
                  <Link
                    href={`/products?brand=${encodeURIComponent(selected.brand)}`}
                    className="text-[13px] text-gray-400 md:text-xs md:font-bold md:text-blue-600 md:uppercase md:tracking-widest hover:underline"
                  >
                    {selected.brand}
                  </Link>
                )}
                <div className="flex items-start justify-between gap-3 mt-1 md:mt-0.5">
                  <h1 className="text-[20px] md:text-2xl font-semibold md:font-extrabold text-gray-900 leading-snug flex-1">
                    {selected.name}
                  </h1>
                  <WishlistButton
                    productId={selected.id}
                    productName={selected.name}
                  />
                </div>
              </div>

              {/* Stars */}
              {rating > 0 && <StarRow value={rating} count={reviewCount} />}

              {/* Price */}
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-[28px] md:text-3xl font-bold md:font-extrabold text-gray-900">
                  ₹{Math.round(price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-base md:text-lg text-gray-400 line-through">
                      ₹{Math.round(mrp)}
                    </span>
                    <span className="bg-[#FF4D4F] text-white text-xs font-bold px-2 py-1 rounded-md">
                      {discountPct}% OFF
                    </span>
                  </>
                )}
              </div>
              {hasDiscount && (
                <p className="text-sm font-medium text-[#16A34A] -mt-2">
                  You save ₹{Math.round(savings)}
                </p>
              )}

              {/* Stock */}
              <div
                className={`flex items-center gap-2 text-sm font-semibold ${
                  isOutOfStock ? "text-red-500" : "text-[#16A34A]"
                }`}
              >
                {isOutOfStock ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Currently out of stock</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      In Stock
                      {selected.stock_quantity != null &&
                        selected.stock_quantity <= 10 &&
                        ` · Only ${selected.stock_quantity} left`}
                    </span>
                  </>
                )}
              </div>

              {/* Delivery */}
              {!isOutOfStock && <DeliveryInfo />}

              {/* Trust badges (#8) */}
              <TrustBadges />

              {/* Variants */}
              {hasVariants && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Select Pack Size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {localVariants.map((v) => {
                      const oos = (v.stock_quantity ?? 0) <= 0;
                      const isActive = v.id === selectedId;
                      const vPrice = parseFloat(v.price || 0);
                      const vMrp = parseFloat(v.mrp || vPrice);
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleVariantSelect(v)}
                          disabled={oos}
                          className={`relative flex flex-col items-center px-4 py-2.5 min-w-18 rounded-xl border-2 transition-all
                          ${
                            isActive
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : oos
                                ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                : "border-gray-200 bg-white hover:border-blue-300"
                          }`}
                        >
                          <span
                            className={`text-xs font-semibold ${isActive ? "text-blue-800" : oos ? "text-gray-300 line-through" : "text-gray-700"}`}
                          >
                            {variantLabel(v)}
                          </span>
                          <span
                            className={`text-xs font-bold mt-0.5 ${isActive ? "text-blue-700" : "text-gray-600"}`}
                          >
                            ₹{vPrice.toFixed(0)}
                          </span>
                          {vMrp > vPrice && !oos && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{vMrp.toFixed(0)}
                            </span>
                          )}
                          {oos && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-400 text-white text-[8px] font-bold px-1 rounded-full">
                              OOS
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -- Add to Cart + Buy Now — mobile: full-width 48px, desktop: row -- */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap md:pt-1">
                {isOutOfStock ? (
                  <div className="w-full h-[48px] flex items-center justify-center gap-2 bg-gray-100 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
                    <Package className="w-4 h-4" />
                    Out of Stock
                  </div>
                ) : qty === 0 ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleAdd}
                      className="flex-1 h-[48px] flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-all whitespace-nowrap px-4"
                    >
                      <ShoppingCart className="w-5 h-5 shrink-0" />
                      Add to Cart
                    </button>
                    <button
                      onClick={handleBuyNow}
                      className="flex-1 h-[48px] flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-all whitespace-nowrap px-4"
                    >
                      <Zap className="w-5 h-5 shrink-0" />
                      Buy Now
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 items-center">
                    {/* Qty stepper — full width on mobile */}
                    <div className="flex-1 flex items-center bg-[#16A34A] rounded-xl overflow-hidden shadow-sm h-[48px]">
                      <button
                        onClick={() => updateQty(selected.id, qty - 1)}
                        className="w-14 h-full flex items-center justify-center text-white hover:bg-green-700 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="flex-1 font-bold text-white text-lg text-center select-none">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQty(selected.id, qty + 1)}
                        disabled={qty >= (selected.stock_quantity ?? 99)}
                        className="w-14 h-full flex items-center justify-center text-white hover:bg-green-700 transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={openCart}
                      className="h-[48px] px-5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shrink-0"
                    >
                      View Cart
                    </button>
                  </div>
                )}

                {/* Share */}
                <button
                  onClick={() =>
                    navigator.share?.({
                      title: selected.name,
                      url: window.location.href,
                    })
                  }
                  className="self-end md:self-auto w-11 h-11 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors shrink-0"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Key Highlights */}
              <KeyHighlights description={selected.description} />

              {/* Details grid */}
              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {selected.unit_pack_size && (
                  <Detail label="Pack Size" value={selected.unit_pack_size} />
                )}
                {selected.unit_type && (
                  <Detail label="Unit" value={selected.unit_type} />
                )}
                {selected.gst_percentage != null && (
                  <Detail label="GST" value={`${selected.gst_percentage}%`} />
                )}
                {selected.hsn_code && (
                  <Detail label="HSN Code" value={selected.hsn_code} />
                )}
                {selected.min_order_quantity > 1 && (
                  <Detail
                    label="Min Order"
                    value={`${selected.min_order_quantity} unit(s)`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* -- Description (expandable — progressive disclosure) -- */}
        {selected.description && (
          <div className="mt-4 md:mt-6 bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm border-t border-gray-100 overflow-hidden">
            <button
              onClick={() => setDescExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left"
            >
              <h2 className="text-base md:text-lg font-bold text-gray-900">
                About this product
              </h2>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${
                  descExpanded ? "rotate-90" : ""
                }`}
              />
            </button>
            {descExpanded && (
              <div className="px-4 md:px-6 pb-5">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {selected.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* -- Similar Products -- */}
        {related.length > 0 && (
          <section className="mt-6 md:mt-8">
            <div className="flex items-center justify-between mb-3 md:mb-4 px-4 md:px-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">
                Similar Products
              </h2>
              <Link
                href={`/categories/${relatedCatId}`}
                className="text-sm text-[#16A34A] hover:underline font-medium"
              >
                View all
              </Link>
            </div>
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-3 px-4 scrollbar-hide md:hidden">
              {related.slice(0, 12).map((p) => (
                <div key={p.id} className="shrink-0 w-[160px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {related.slice(0, 12).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* -- People Also Bought -- */}
        {peopleAlsoBought.length > 0 && (
          <section className="mt-6 md:mt-8">
            <div className="flex items-center justify-between mb-3 md:mb-4 px-4 md:px-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">
                People Also Bought
              </h2>
            </div>
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-3 px-4 scrollbar-hide md:hidden">
              {peopleAlsoBought.map((p) => (
                <div key={p.id} className="shrink-0 w-[160px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {peopleAlsoBought.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* -- Sticky cart bar -- */}
        <StickyCartBar product={selected} sentinelRef={sentinelRef} />
      </div>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}

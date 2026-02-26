"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Minus,
  ChevronRight,
  Package,
  AlertCircle,
  CheckCircle2,
  Share2,
} from "lucide-react";
import ImageWithFallback from "@/components/common/ImageWithFallback";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/category/ProductCard";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
function variantLabel(v) {
  return v.unit_pack_size || v.variant || `₹${parseFloat(v.price).toFixed(0)}`;
}
export default function ProductDetailClient({ product, variants: initialVariants }) {
  const { lang } = useLanguage();
  const { items, addItem, updateQty, openCart } = useCart();
  const [localProduct, setLocalProduct] = useState(product);
  const [localVariants, setLocalVariants] = useState(initialVariants);
  useEffect(() => {
    let cancelled = false;
    async function refetch() {
      try {
        const res = await fetch(
          `${API_URL}/products/${product.id}?lang=${lang}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const prod = json.data;
        if (!prod) return;
        setLocalProduct(prod);
        if (prod.brand) {
          const vRes = await fetch(
            `${API_URL}/products?brand=${encodeURIComponent(prod.brand)}&category_id=${prod.category_id}&limit=50&is_active=true&lang=${lang}`,
            { cache: "no-store" }
          );
          if (!vRes.ok || cancelled) return;
          const vJson = await vRes.json();
          const vs = vJson.data || [];
          setLocalVariants(vs.length > 0 ? vs : [prod]);
        } else {
          setLocalVariants([prod]);
        }
      } catch {
      }
    }
    refetch();
    return () => { cancelled = true; };
  }, [lang, product.id, product.brand, product.category_id]);
  const [selectedId, setSelectedId] = useState(product.id);
  const [related, setRelated]               = useState([]);
  const [relatedCatName, setRelatedCatName] = useState("");
  const [relatedCatId,   setRelatedCatId]   = useState("");
  useEffect(() => {
    let cancelled = false;
    async function fetchRelated() {
      try {
        const useParent = !!(localProduct.category_parent_id || product.category_parent_id);
        const parentId  = localProduct.category_parent_id || product.category_parent_id;
        const catName   = useParent
          ? (localProduct.parent_category_name || product.parent_category_name || "")
          : (localProduct.category_name        || product.category_name        || "");
        const catId     = useParent ? parentId : product.category_id;
        const param = useParent
          ? `parent_category_id=${parentId}`
          : `category_id=${product.category_id}`;
        const res = await fetch(
          `${API_URL}/products?${param}&limit=24&is_active=true&lang=${lang}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const all = json.data || [];
        const filtered = all.filter(
          (p) =>
            p.id !== product.id &&
            (!product.brand || !p.brand || p.brand.toLowerCase() !== product.brand.toLowerCase())
        );
        if (!cancelled) {
          setRelated(filtered.slice(0, 8));
          setRelatedCatName(catName);
          setRelatedCatId(catId);
        }
      } catch {
      }
    }
    fetchRelated();
    return () => { cancelled = true; };
  }, [lang, product.id, product.category_id, product.brand, localProduct.category_parent_id, localProduct.parent_category_name]);
  useEffect(() => {
    setSelectedId(product.id);
  }, [product.id]);
  const selected = localVariants.find((v) => v.id === selectedId) || localProduct;
  const price = parseFloat(selected.price || 0);
  const mrp = parseFloat(selected.mrp || price);
  const hasDiscount = mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOutOfStock = (selected.stock_quantity ?? 0) <= 0;
  const cartItem = items.find((i) => i.id === selected.id);
  const qty = cartItem?.quantity ?? 0;
  const imagesForVariant = (v) =>
    v.image_urls?.length
      ? v.image_urls
      : v.image_url
      ? [v.image_url]
      : [];
  const [galleryImages, setGalleryImages] = useState(() => imagesForVariant(selected));
  const [selectedImage, setSelectedImage] = useState(() => galleryImages[0] || null);
  useEffect(() => {
    const base = imagesForVariant(selected);
    setGalleryImages(base);
    setSelectedImage(base[0] || null);
  }, [selectedId, localProduct]);
  useEffect(() => {
    if (galleryImages.length >= 4) return;
    let cancelled = false;
    const searchName = selected.name_en || selected.name || "";
    const brand = selected.brand || "";
    if (!searchName) return;
    fetch(
      `/api/product-images?id=${encodeURIComponent(selected.id)}&name=${encodeURIComponent(searchName)}&brand=${encodeURIComponent(brand)}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.urls?.length) return;
        setGalleryImages(json.urls);
        setSelectedImage((prev) => prev || json.urls[0]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected.id, galleryImages.length]);
  const [fading, setFading] = useState(false);
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
    [selectedId]
  );
  const handleAdd = async () => {
    if (isOutOfStock) return;
    await addItem(selected, 1);
    openCart();
  };
  const hasVariants = localVariants.length > 1;
  const mainImage = selectedImage || galleryImages[0] || selected.image_url;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      { }
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        { }
        {(localProduct.category_parent_id || product.category_parent_id) && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Link
              href={`/categories/${localProduct.category_parent_id || product.category_parent_id}`}
              className="hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              {localProduct.parent_category_name || product.parent_category_name}
            </Link>
          </>
        )}
        { }
        {(localProduct.category_name || selected.category_name) && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Link
              href={`/categories/${product.category_id}`}
              className="hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              {localProduct.category_name || selected.category_name}
            </Link>
          </>
        )}
        { }
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium line-clamp-1 max-w-xs">
          {selected.name}
        </span>
      </nav>
      { }
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0">
          { }
          <div className="md:w-2/5 bg-gray-50 flex flex-col p-4 sm:p-6 gap-4">
            { }
            <div className="relative flex items-center justify-center bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ minHeight: "280px" }}>
              {isOutOfStock && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                  Out of Stock
                </div>
              )}
              {hasDiscount && !isOutOfStock && (
                <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                  {discountPct}% OFF
                </div>
              )}
              <div className={`w-full h-64 sm:h-72 p-4 ${isOutOfStock ? "opacity-50 grayscale" : ""}`}>
                <ImageWithFallback
                  src={mainImage}
                  alt={selected.name}
                  className="w-full h-full object-contain"
                  size="lg"
                />
              </div>
            </div>
            { }
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((url, i) => {
                  const LABELS = ["Front", "Back", "Nutrition", "Contact"];
                  const label = LABELS[i] || `View ${i + 1}`;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(url)}
                      title={label}
                      className={`shrink-0 flex flex-col items-center gap-1 transition-all`}
                    >
                      <div className={`w-16 h-16 rounded-lg border-2 overflow-hidden bg-white ${
                        selectedImage === url
                          ? "border-green-500 ring-2 ring-green-200"
                          : "border-gray-200 hover:border-gray-400"
                      }`}>
                        <ImageWithFallback
                          src={url}
                          alt={label}
                          className="w-full h-full object-contain p-1"
                          size="sm"
                        />
                      </div>
                      <span className={`text-[10px] font-medium ${
                        selectedImage === url ? "text-green-600" : "text-gray-400"
                      }`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          { }
          <div className={`md:w-3/5 p-6 sm:p-8 flex flex-col gap-4 transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}>
            { }
            {selected.brand && (
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {selected.brand}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {selected.name}
            </h1>
            { }
            {selected.sku && (
              <p className="text-xs text-gray-400">SKU: {selected.sku}</p>
            )}
            { }
            <div className="flex items-end gap-3">
              <span className="text-3xl font-extrabold text-gray-900">
                ₹{price.toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    ₹{mrp.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Save ₹{(mrp - price).toFixed(2)}
                  </span>
                </>
              )}
            </div>
            { }
            <div className={`flex items-center gap-1.5 text-sm font-medium ${
              isOutOfStock ? "text-red-500" : "text-green-600"
            }`}>
              {isOutOfStock ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Currently out of stock</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    In stock
                    {selected.stock_quantity != null &&
                      selected.stock_quantity <= 10 &&
                      ` – only ${selected.stock_quantity} left`}
                  </span>
                </>
              )}
            </div>
            { }
            {hasVariants && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Select Unit
                </p>
                <div className="flex flex-wrap gap-2">
                  {localVariants.map((v) => {
                    const outOfStock = (v.stock_quantity ?? 0) <= 0;
                    const isActive = v.id === selectedId;
                    const vPrice = parseFloat(v.price || 0);
                    const vMrp = parseFloat(v.mrp || vPrice);
                    const vLabel = variantLabel(v);
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleVariantSelect(v)}
                        disabled={outOfStock}
                        title={outOfStock ? "Out of Stock" : undefined}
                        className={`relative flex flex-col items-center justify-center px-4 py-2.5 min-w-[72px] rounded-xl border-2 transition-all
                          ${isActive
                            ? "border-green-600 bg-white shadow-sm"
                            : outOfStock
                            ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed opacity-60"
                            : "border-gray-200 bg-white hover:border-green-400"
                          }`}
                      >
                        { }
                        <span className={`text-xs font-semibold leading-tight ${
                          isActive ? "text-gray-800" : outOfStock ? "text-gray-300 line-through" : "text-gray-700"
                        }`}>
                          {vLabel}
                        </span>
                        { }
                        <span className={`text-xs font-bold mt-0.5 ${
                          isActive ? "text-green-700" : outOfStock ? "text-gray-300" : "text-gray-600"
                        }`}>
                          ₹{vPrice.toFixed(0)}
                        </span>
                        { }
                        {vMrp > vPrice && !outOfStock && (
                          <span className="text-[10px] text-gray-400 line-through leading-none">
                            ₹{vMrp.toFixed(0)}
                          </span>
                        )}
                        { }
                        {outOfStock && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-400 text-white text-[8px] font-bold px-1 rounded-full leading-tight">
                            OOS
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            { }
            <div className="flex items-center gap-3 pt-2">
              {isOutOfStock ? (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
                  <Package className="w-4 h-4" />
                  Out of Stock
                </div>
              ) : qty === 0 ? (
                <button
                  onClick={handleAdd}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center border-2 border-green-500 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQty(selected.id, qty - 1)}
                      className="px-3 py-2.5 hover:bg-green-50 text-green-700 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-bold text-gray-900 text-base min-w-[40px] text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => updateQty(selected.id, qty + 1)}
                      disabled={qty >= (selected.stock_quantity ?? 99)}
                      className="px-3 py-2.5 hover:bg-green-50 text-green-700 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={openCart}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    View Cart
                  </button>
                </div>
              )}
            </div>
            { }
            {selected.description && (
              <div className="pt-2 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  About this product
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selected.description}
                </p>
              </div>
            )}
            { }
            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
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
      { }
      {related.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              More from{" "}
              <Link
                href={`/categories/${relatedCatId || product.category_id}`}
                className="text-blue-600 hover:underline"
              >
                {relatedCatName || localProduct.category_name || "this category"}
              </Link>
            </h2>
            <Link
              href={`/categories/${relatedCatId || product.category_id}`}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
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
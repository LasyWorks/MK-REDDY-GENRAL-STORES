"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDialog } from "@/context/DialogContext";
import {
  Squares2X2Icon as LayoutDashboard,
  CubeIcon as Package,
  ShoppingCartIcon as ShoppingCart,
  UsersIcon as Users,
  ArrowLeftOnRectangleIcon as LogOut,
  ArrowTrendingUpIcon as TrendingUp,
  ExclamationTriangleIcon as AlertTriangle,
  MagnifyingGlassIcon as Search,
  PlusIcon as Plus,
  PencilIcon as Pencil,
  TrashIcon as Trash2,
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  BuildingStorefrontIcon as Store,
  ArrowPathIcon,
  XMarkIcon as X,
  CheckIcon as Check,
  CurrencyRupeeIcon as CircleDollarSign,
  ArrowUpRightIcon as ArrowUpRight,
  ArrowDownRightIcon as ArrowDownRight,
  UserPlusIcon as UserCheck,
  UserMinusIcon as UserX,
  ShieldCheckIcon as ShieldCheck,
  ShieldExclamationIcon as ShieldOff,
  PhoneIcon as Phone,
  EnvelopeIcon as Mail,
  MegaphoneIcon as Megaphone,
  CalendarIcon as CalendarClock,
  ClockIcon as Clock,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  TagIcon as Tag,
  GiftIcon as Gift,
  BellIcon as Bell,
  ChartBarIcon as Activity,
  StarIcon,
  LightBulbIcon,
  Cog6ToothIcon as Cog,
} from "@heroicons/react/24/outline";
const Loader2 = ArrowPathIcon;
const RefreshCcw = ArrowPathIcon;
import ImageWithFallback from "@/components/common/ImageWithFallback";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";
import StatCards, { AlertCards } from "@/components/admin/StatCards";
import RevenueChart from "@/components/admin/RevenueChart";
import RecentOrders from "@/components/admin/RecentOrders";
import QuickActions from "@/components/admin/QuickActions";
import TopProducts from "@/components/admin/TopProducts";
import FrequentlyBoughtProducts from "@/components/admin/FrequentlyBoughtProducts";
import RecentActivity from "@/components/admin/RecentActivity";
import UserWiseSales from "@/components/admin/UserWiseSales";
import CategoriesTab from "@/components/admin/CategoriesTab";
import { usePromotions } from "@/context/PromotionContext";
function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(null);
  useEffect(() => {
    const token = secureStorage.getItem("token");
    const raw = secureStorage.getItem("user");
    if (!token || !raw) {
      router.replace("/login?redirect=/admin/dashboard");
      return;
    }
    try {
      const user = JSON.parse(raw);
      if (user.user_type !== "admin" && user.role !== "admin") {
        router.replace("/");
        return;
      }
      setAdmin(user);
      setReady(true);
    } catch {
      router.replace("/login?redirect=/admin/dashboard");
    }
  }, [router]);
  return { ready, admin };
}
const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  ready_for_pickup: "bg-indigo-100 text-indigo-700",
  picked_up: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
function StatusBadge({ status }) {
  const label =
    {
      pending: "Pending",
      confirmed: "Confirmed",
      ready_for_pickup: "Ready for Pickup",
      picked_up: "Picked Up",
      cancelled: "Cancelled",
    }[status] || status;
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </span>
  );
}
const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
];
const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: [],
};
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready_for_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};
function fmtCurrency(n) {
  const num = parseFloat(n || 0);
  if (num >= 10_00_000) return `₹${(num / 10_00_000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4 items-start">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
// Returns context-aware unit chips for the ProductModal based on category name
function getUnitOptions(categoryName = "") {
  const n = categoryName.toLowerCase();
  if (/rice|cereal|wheat/.test(n))
    return ["1 kg", "500 g", "250 g", "5 kg", "2 kg", "10 kg", "25 kg"];
  if (/atta|flour|maida|sooji|rava/.test(n))
    return ["1 kg", "500 g", "2 kg", "5 kg", "250 g", "10 kg"];
  if (/dal|lentil|pulse|chana|moong|urad/.test(n))
    return ["1 kg", "500 g", "250 g", "2 kg", "5 kg"];
  if (/oil|ghee|vanaspati/.test(n))
    return ["500 ml", "1 L", "2 L", "5 L", "200 ml", "500 g", "1 kg", "1.5 L"];
  if (/spice|masala|powder|pepper|chilli/.test(n))
    return ["50 g", "100 g", "200 g", "500 g", "1 kg"];
  if (/salt|sugar|jaggery|belam/.test(n))
    return ["1 kg", "500 g", "2 kg", "5 kg", "250 g"];
  if (/tamarind|imli|pickle|sauce|ketchup|chutney/.test(n))
    return ["200 g", "500 g", "1 kg", "250 ml", "500 ml"];
  if (/tea|chai/.test(n)) return ["100 g", "250 g", "500 g", "1 kg", "50 g"];
  if (/coffee/.test(n)) return ["50 g", "100 g", "200 g", "500 g", "1 kg"];
  if (/cold drink|juice|soda|aerated|energy/.test(n))
    return ["200 ml", "500 ml", "600 ml", "1 L", "1.5 L", "2 L"];
  if (/water/.test(n)) return ["500 ml", "1 L", "2 L", "5 L", "20 L"];
  if (/health drink|malt|horlicks|bournvita/.test(n))
    return ["200 g", "500 g", "1 kg", "400 g"];
  if (/biscuit|cookie/.test(n))
    return ["100 g", "200 g", "400 g", "500 g", "1 kg"];
  if (/chips|namkeen|snack/.test(n))
    return ["25 g", "50 g", "100 g", "200 g", "500 g"];
  if (/dry fruit|nut|almond|cashew|raisin/.test(n))
    return ["100 g", "250 g", "500 g", "1 kg"];
  if (/chocolate|sweet|candy/.test(n))
    return ["50 g", "100 g", "200 g", "400 g", "500 g"];
  if (/noodle|pasta|vermicelli/.test(n))
    return ["70 g", "200 g", "400 g", "500 g", "1 kg"];
  if (/milk|curd|yogurt/.test(n))
    return ["500 ml", "1 L", "200 ml", "400 ml", "100 ml"];
  if (/butter|cheese|paneer|khoya/.test(n))
    return ["100 g", "200 g", "500 g", "400 g", "1 kg"];
  if (/bread|bakery/.test(n)) return ["1 pcs", "400 g", "200 g", "pcs"];
  if (/egg/.test(n)) return ["6 pcs", "12 pcs", "30 pcs", "pcs"];
  if (/soap|body wash/.test(n))
    return ["75 g", "100 g", "125 g", "150 g", "200 ml", "500 ml"];
  if (/shampoo|conditioner|hair oil/.test(n))
    return ["100 ml", "180 ml", "200 ml", "340 ml", "400 ml", "500 ml"];
  if (/toothpaste|dental|oral/.test(n))
    return ["50 g", "80 g", "100 g", "150 g", "200 g"];
  if (/skin|lotion|cream|face/.test(n))
    return ["50 ml", "100 ml", "200 ml", "50 g", "100 g"];
  if (/detergent|washing powder|washing liquid/.test(n))
    return ["500 g", "1 kg", "2 kg", "3 kg", "5 kg"];
  if (/dishwash|kitchen clean/.test(n))
    return ["250 ml", "500 ml", "1 L", "250 g", "500 g"];
  if (/floor|toilet|bathroom|cleaner/.test(n))
    return ["500 ml", "1 L", "2 L", "100 ml"];
  if (/air freshener|repellent/.test(n))
    return ["200 ml", "250 ml", "300 ml", "pcs"];
  if (/vegetable|fruit|herb|leafy/.test(n))
    return ["250 g", "500 g", "1 kg", "2 kg"];
  if (/baby food|formula/.test(n)) return ["200 g", "400 g", "500 g", "1 kg"];
  if (/diaper|wipe/.test(n))
    return ["20 pcs", "40 pcs", "80 pcs", "pcs", "pack"];
  if (/stationery|writing|battery|electronic|pooja|agarbathi|general/.test(n))
    return ["1 pcs", "pcs", "pack", "set"];
  return ["1 kg", "500 g", "250 g", "1 L", "500 ml", "pcs", "pack"];
}
function OverviewTab({ onSwitchTab }) {
  const { toast } = useDialog();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [sRes, oRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/orders", { limit: 10, sort: "created_at_desc" }),
      ]);
      setStats(sRes.data);
      setOrders(oRes.data || []);
    } catch (e) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
  };
  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleStatusUpdate(orderId, newStatus) {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (e) {
      toast(e.message || "Update failed", "error");
    }
  }

  function handleCardClick(key) {
    if (key === "orders") onSwitchTab?.("orders");
    else if (key === "products") onSwitchTab?.("products");
    else if (key === "customers") onSwitchTab?.("users");
  }

  function handleQuickNav(tab) {
    onSwitchTab?.(tab);
  }

  if (error && !stats)
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={() => load()}
          className="mt-3 text-sm text-emerald-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {refreshing && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          )}
          {refreshing ? "Updating..." : "Auto-refreshes every 30s"}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all text-sm font-medium shadow-sm"
        >
          <RefreshCcw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Quick Actions */}
      <QuickActions onNavigate={handleQuickNav} />

      {/* KPI Cards */}
      <StatCards
        stats={stats}
        loading={loading}
        onCardClick={handleCardClick}
      />

      {/* Alert Cards */}
      <AlertCards stats={stats} />

      {/* Revenue Chart */}
      <RevenueChart />

      {/* Frequently Bought Products */}
      <FrequentlyBoughtProducts />

      {/* User-wise Sales */}
      <UserWiseSales />

      {/* Two column layout: Orders + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentOrders
            orders={orders}
            loading={loading}
            onStatusUpdate={handleStatusUpdate}
            onViewAll={() => onSwitchTab?.("orders")}
          />
        </div>
        <div className="space-y-6">
          <TopProducts />
          <RecentActivity
            initialActivity={stats?.recentActivity}
            statsLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}
function ProductModal({ product, categories, allProducts = [], onClose, onSaved }) {
  const isEdit = !!product;
  const initImages = () => {
    if (Array.isArray(product?.image_urls) && product.image_urls.length)
      return product.image_urls.filter(Boolean);
    if (product?.image_url) return [product.image_url];
    return [""];
  };

  // Get parent category for existing product
  const getParentCategoryId = () => {
    if (!product?.category_id) return "";
    const category = categories.find((c) => c.id === product.category_id);
    return category?.parent_id || product.category_id;
  };

  const [form, setForm] = useState({
    name_en: product?.name || "",
    brand: product?.brand || "",
    sku: product?.sku || "",
    mrp: product?.mrp || "",
    price: product?.price || "",
    stock_quantity: product?.stock_quantity ?? "",
    unit: product?.variant || product?.unit || "",
    category_id: product?.category_id || "",
    description_en: product?.description || "",
    is_active: product?.is_active !== false,
    is_featured: product?.is_featured || false,
    parent_product_id: product?.parent_product_id || "",
  });

  const [parentCategoryId, setParentCategoryId] = useState(
    getParentCategoryId(),
  );
  const [imageUrls, setImageUrls] = useState(initImages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setImg = (i, val) =>
    setImageUrls((a) => a.map((u, idx) => (idx === i ? val : u)));
  const addImg = () => setImageUrls((a) => [...a, ""]);  const removeImg = (i) =>
    setImageUrls((a) =>
      a.length === 1 ? [""] : a.filter((_, idx) => idx !== i),
    );
  const moveImg = (i, dir) =>
    setImageUrls((a) => {
      const b = [...a];
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      [b[i], b[j]] = [b[j], b[i]];
      return b;
    });
  async function save(e) {
    e.preventDefault();
    if (!form.name_en.trim()) {
      setError("Product name is required");
      return;
    }
    if (!form.price || !form.mrp) {
      setError("Price and MRP are required");
      return;
    }
    if (!form.category_id) {
      setError("Please select a category and subcategory");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const imgs = imageUrls.filter(Boolean);
      // map form.unit → variant (the DB column that stores "1 kg", "500 g" etc.)
      const payload = {
        ...form,
        image_urls: imgs,
        image_url: imgs[0] || null,
        variant: form.unit,
        parent_product_id: form.parent_product_id || null,
      };
      if (isEdit) await api.put(`/products/${product.id}`, payload);
      else await api.post("/products", payload);
      onSaved();
    } catch (e) {
      // Show clearer error messages for common issues
      const errorMsg = e.message || "Save failed";
      if (errorMsg.includes("SKU")) {
        setError(`SKU conflict: ${errorMsg}`);
      } else if (errorMsg.includes("category")) {
        setError(`Category error: ${errorMsg}`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">
                  Product Images
                </label>
                <button
                  type="button"
                  onClick={addImg}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Image
                </button>
              </div>
              <div className="space-y-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    {}
                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {url ? (
                        <img
                          src={url}
                          alt={`img-${i}`}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Package className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    {}
                    {i === 0 && (
                      <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        Primary
                      </span>
                    )}
                    {}
                    <input
                      value={url}
                      onChange={(e) => setImg(i, e.target.value)}
                      placeholder="Paste image URL…"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {}
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveImg(i, -1)}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 flex-shrink-0"
                      title="Move up"
                    >
                      ▲
                    </button>
                    {}
                    <button
                      type="button"
                      disabled={i === imageUrls.length - 1}
                      onClick={() => moveImg(i, 1)}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 flex-shrink-0"
                      title="Move down"
                    >
                      ▼
                    </button>
                    {}
                    <button
                      type="button"
                      onClick={() => removeImg(i)}
                      className="text-gray-300 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                First image is the primary thumbnail. Use ▲▼ to reorder.
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Product Name *
              </label>
              <input
                value={form.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                SKU (Stock Keeping Unit)
              </label>
              <input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {isEdit
                  ? "Change carefully - must be unique"
                  : "Leave empty to auto-generate"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Brand
              </label>
              <input
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Unit
              </label>
              {/* Smart chip picker — options change based on selected category */}
              {(() => {
                const parentCat = categories.find(
                  (c) => c.id === parentCategoryId,
                );
                const subcat = categories.find(
                  (c) => c.id === form.category_id,
                );
                const chips = getUnitOptions(
                  subcat?.name || parentCat?.name || "",
                );
                return (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(chips)].map((chip, i) => (
                        <button
                          type="button"
                          key={`${chip}-${i}`}
                          onClick={() => set("unit", chip)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                            form.unit === chip
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      value={form.unit}
                      onChange={(e) => set("unit", e.target.value)}
                      placeholder="e.g. 1 kg / 500 g / pcs / 1 L"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-gray-400">
                      Click a chip or type a custom unit
                    </p>
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                MRP (₹) *
              </label>
              <input
                type="number"
                value={form.mrp}
                onChange={(e) => set("mrp", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Stock Qty
              </label>
              <input
                type="number"
                value={form.stock_quantity}
                onChange={(e) => set("stock_quantity", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Parent Category
              </label>
              <select
                value={parentCategoryId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setParentCategoryId(pid);
                  set("category_id", ""); // Reset subcategory
                  const parentCat = categories.find((c) => c.id === pid);
                  if (parentCat) {
                    const opts = getUnitOptions(parentCat.name);
                    if (opts.length) set("unit", opts[0]);
                  }
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— select parent —</option>
                {categories
                  .filter((c) => !c.parent_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Subcategory *
              </label>
              <select
                value={form.category_id}
                onChange={(e) => {
                  const sid = e.target.value;
                  set("category_id", sid);
                  const subcat = categories.find((c) => c.id === sid);
                  if (subcat) {
                    const opts = getUnitOptions(subcat.name);
                    if (opts.length) set("unit", opts[0]);
                  }
                }}
                disabled={!parentCategoryId}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— select subcategory —</option>
                {categories
                  .filter((c) => c.parent_id === parentCategoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {!parentCategoryId && (
                <p className="text-xs text-gray-400 mt-1">
                  Select parent category first
                </p>
              )}
            </div>
            {/* ── Variant Grouping ── */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Parent Product (for weight/size variants)
              </label>
              {form.parent_product_id ? (
                <div className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2">
                  <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm text-gray-800 flex-1 truncate">
                    {allProducts.find(p => p.id === form.parent_product_id)?.name || form.parent_product_id}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100 px-1.5 py-0.5 rounded">
                    {allProducts.find(p => p.id === form.parent_product_id)?.variant ||
                     allProducts.find(p => p.id === form.parent_product_id)?.unit_pack_size || ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => { set("parent_product_id", ""); setParentSearch(""); }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Search by product name to link as variant…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {parentSearch.length >= 2 && (
                    <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-50">
                      {allProducts
                        .filter(p =>
                          p.id !== product?.id &&
                          !p.parent_product_id &&
                          (p.name || '').toLowerCase().includes(parentSearch.toLowerCase())
                        )
                        .slice(0, 8)
                        .map(p => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              set("parent_product_id", p.id);
                              // Auto-fill brand & category from parent to keep consistency
                              if (p.brand && !form.brand) set("brand", p.brand);
                              if (p.category_id && !form.category_id) {
                                set("category_id", p.category_id);
                                const cat = categories.find(c => c.id === p.category_id);
                                if (cat?.parent_id) setParentCategoryId(cat.parent_id);
                              }
                              setParentSearch("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2"
                          >
                            <div className="w-7 h-7 rounded bg-gray-50 overflow-hidden shrink-0">
                              <ImageWithFallback src={p.image_url} alt="" className="w-full h-full object-contain" size="sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-400">{p.variant || p.unit_pack_size || ''} · ₹{p.price}</p>
                            </div>
                          </button>
                        ))}
                      {allProducts.filter(p =>
                        p.id !== product?.id &&
                        !p.parent_product_id &&
                        (p.name || '').toLowerCase().includes(parentSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs text-gray-400 px-3 py-2">No matching products</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                Link this product as a size variant of another product (e.g. Toor Dal 500gm → parent: Toor Dal 250gm)
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description_en}
                onChange={(e) => set("description_en", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active (visible in store)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={form.is_featured}
                  onChange={(e) => set("is_featured", e.target.checked)}
                  className="w-4 h-4 accent-yellow-500"
                />
                <label
                  htmlFor="is_featured"
                  className="text-sm text-gray-700 flex items-center gap-1"
                >
                  <StarIcon className="w-3.5 h-3.5 text-yellow-500" /> Featured
                  (show on homepage)
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
/* ── Variant sub-row (indented, lighter) ── */
function VariantSubRow({ p, onEdit, onDelete, deleting }) {
  const mrp = parseFloat(p.mrp || 0);
  const price = parseFloat(p.price || 0);
  const disc = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const img = Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_url;
  return (
    <tr className="bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors border-l-2 border-indigo-200">
      <td className="pl-14 pr-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gray-50 flex-shrink-0 overflow-hidden">
            <ImageWithFallback src={img} alt={p.name} size="sm" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700">
              {p.variant || p.unit_pack_size || p.unit || "Variant"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2 text-xs text-gray-400">—</td>
      <td className="px-4 py-2">
        <span className="font-semibold text-gray-900 text-sm">₹{price}</span>
        {mrp > price && <span className="ml-1 text-xs text-gray-400 line-through">₹{mrp}</span>}
      </td>
      <td className="px-4 py-2">
        {disc > 0 ? (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{disc}%</span>
        ) : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-2">
        {(p.stock_quantity ?? 0) > 0 ? (
          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{p.stock_quantity} In Stock</span>
        ) : (
          <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">Out of Stock</span>
        )}
      </td>
      <td className="px-4 py-2" />
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(p)} className="p-1 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(p.id)} disabled={deleting === p.id} className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Quick Add Variant Modal ── */
function VariantModal({ parent, onClose, onSaved }) {
  const [form, setForm] = useState({
    unit: "",
    price: "",
    mrp: "",
    stock_quantity: 100,
    image_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!form.unit.trim()) { setError("Size / variant label is required"); return; }
    if (!form.price || !form.mrp) { setError("Price and MRP are required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name_en: parent.name,
        brand: parent.brand || "",
        sku: "",
        mrp: form.mrp,
        price: form.price,
        stock_quantity: form.stock_quantity,
        variant: form.unit,
        unit: form.unit,
        category_id: parent.category_id,
        description_en: parent.description || "",
        is_active: true,
        is_featured: false,
        parent_product_id: parent.id,
        image_urls: form.image_url ? [form.image_url] : (Array.isArray(parent.image_urls) ? parent.image_urls : parent.image_url ? [parent.image_url] : []),
        image_url: form.image_url || (Array.isArray(parent.image_urls) ? parent.image_urls[0] : parent.image_url) || null,
      };
      await api.post("/products", payload);
      onSaved();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-sm text-gray-900">Add Variant</h2>
            <p className="text-xs text-gray-400 mt-0.5">for {parent.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-5 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Size / Pack Label *</label>
            <input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. 250g, 1 kg, Pack of 4" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">MRP (₹) *</label>
              <input type="number" step="0.01" value={form.mrp} onChange={e => set("mrp", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Sell Price (₹) *</label>
              <input type="number" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Stock Quantity</label>
            <input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Image URL (optional)</label>
            <input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="Leave empty to use parent image" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Variant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Parent Product Row (with expandable variants) ── */
function ProductRow({
  p,
  variants,
  onEdit,
  onDelete,
  deleting,
  onToggleFeatured,
  togglingFeatured,
  onToggleActive,
  togglingActive,
  onAddVariant,
}) {
  const [expanded, setExpanded] = useState(false);
  const mrp = parseFloat(p.mrp || 0);
  const price = parseFloat(p.price || 0);
  const disc = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const img = Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_url;
  const hasVariants = variants && variants.length > 0;
  return (
    <>
    <tr
      className={`hover:bg-gray-50 transition-colors ${p.is_active === false ? "bg-gray-50 opacity-75" : ""}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
            <ImageWithFallback
              src={img}
              alt={p.name}
              size="sm"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-gray-900 text-sm line-clamp-1">
                {p.name}
              </p>
              {p.is_active === false && (
                <span className="bg-red-100 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {[p.brand, p.variant || p.unit_pack_size || p.unit].filter(Boolean).join(" · ")}
              {hasVariants && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1.5 text-blue-600 font-medium hover:text-blue-800"
                >
                  {variants.length + 1} sizes {expanded ? "▾" : "▸"}
                </button>
              )}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-green-700 text-xs font-medium">
        {p.category_name || "—"}
      </td>
      <td className="px-4 py-3">
        <span className="font-semibold text-gray-900">₹{price}</span>
        {mrp > price && (
          <span className="ml-1 text-xs text-gray-400 line-through">
            ₹{mrp}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {disc > 0 ? (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {disc}%
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {(p.stock_quantity ?? 0) > 0 ? (
          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {p.stock_quantity} In Stock
          </span>
        ) : (
          <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            Out of Stock
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleFeatured(p)}
          disabled={togglingFeatured === p.id}
          title={p.is_featured ? "Remove from featured" : "Mark as featured"}
          className={`p-1.5 rounded-lg transition-colors ${
            p.is_featured
              ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
              : "text-gray-300 hover:text-yellow-400 hover:bg-yellow-50"
          }`}
        >
          {togglingFeatured === p.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <StarIcon
              className={`w-4 h-4 ${p.is_featured ? "text-yellow-500 fill-yellow-400" : "text-gray-300"}`}
            />
          )}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(p)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleActive(p)}
            disabled={togglingActive === p.id}
            title={
              p.is_active === false ? "Activate product" : "Deactivate product"
            }
            className={`p-1.5 rounded-lg transition-colors ${
              p.is_active === false
                ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                : "text-green-500 hover:text-green-700 hover:bg-green-50"
            }`}
          >
            {togglingActive === p.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : p.is_active === false ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onAddVariant(p)}
            title="Add size variant"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(p.id)}
            disabled={deleting === p.id}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            {deleting === p.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
    {/* Variant sub-rows */}
    {hasVariants && expanded && variants.map(v => (
      <VariantSubRow key={v.id} p={v} onEdit={onEdit} onDelete={onDelete} deleting={deleting} />
    ))}
    </>
  );
}
const TABLE_HEAD = (
  <tr className="bg-gray-50">
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Product
    </th>
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Category
    </th>
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Price
    </th>
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Discount
    </th>
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Stock
    </th>
    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Featured
    </th>
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Actions
    </th>
  </tr>
);
function ProductsTab() {
  const { confirm, toast } = useDialog();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [togglingFeatured, setTogglingFeatured] = useState(null);
  const [togglingActive, setTogglingActive] = useState(null);
  const [openCategories, setOpenCategories] = useState(new Set());
  const searchTimer = useRef(null);
  const load = useCallback(
    async (q = search) => {
      setLoading(true);
      setError("");
      try {
        const params = { page: 1, limit: 500, ...(q ? { search: q } : {}) };
        const [pRes, cRes] = await Promise.all([
          api.get("/products/admin/all", params),
          categories.length
            ? null
            : api.get("/categories/admin/all", { limit: 200 }),
        ]);
        setProducts(pRes.data || []);
        if (cRes) {
          const cats = cRes.data || [];
          setCategories(cats);
          const mainNames = cats.filter((c) => !c.parent_id).map((c) => c.name);
          setOpenCategories(new Set(mainNames));
        }
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [search, categories.length],
  );
  useEffect(() => {
    load();
  }, []);
  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 400);
  }
  async function handleDelete(id) {
    if (
      !(await confirm("Delete this product?", {
        danger: true,
        confirmLabel: "Delete",
      }))
    )
      return;
    setDeleting(id);
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (e) {
      toast(e.message || "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }
  function onSaved() {
    setModal(null);
    load();
  }
  async function handleToggleFeatured(p) {
    setTogglingFeatured(p.id);
    try {
      await api.put(`/products/${p.id}`, { is_featured: !p.is_featured });
      setProducts((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, is_featured: !p.is_featured } : x,
        ),
      );
    } catch (e) {
      toast(e.message || "Failed to update featured status", "error");
    } finally {
      setTogglingFeatured(null);
    }
  }
  async function handleToggleActive(p) {
    setTogglingActive(p.id);
    try {
      const newActive = p.is_active === false ? true : false;
      await api.put(`/products/${p.id}`, { is_active: newActive });
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: newActive } : x)),
      );
    } catch (e) {
      toast(e.message || "Failed to update product status", "error");
    } finally {
      setTogglingActive(null);
    }
  }
  function toggleCategory(name) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }
  const grouped = useMemo(() => {
    // Build a set of all child product IDs (those with parent_product_id)
    const childIds = new Set();
    const variantMap = {}; // parentId -> [child products]
    for (const p of products) {
      if (p.parent_product_id) {
        childIds.add(p.id);
        if (!variantMap[p.parent_product_id]) variantMap[p.parent_product_id] = [];
        variantMap[p.parent_product_id].push(p);
      }
    }
    // Sort variants by price within each group
    for (const key of Object.keys(variantMap)) {
      variantMap[key].sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    }

    const map = {};
    for (const p of products) {
      // Skip child variants — they appear nested under their parent
      if (childIds.has(p.id)) continue;
      const key = p.parent_category_name || p.category_name;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      // Attach variants array to parent product for the row
      const pWithVariants = { ...p, _variants: variantMap[p.id] || [] };
      map[key].push(pWithVariants);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, items }));
  }, [products]);
  function expandAll() {
    setOpenCategories(new Set(grouped.map((g) => g.name)));
  }
  function collapseAll() {
    setOpenCategories(new Set());
  }
  return (
    <div className="space-y-5">
      {}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {}
      {!loading && grouped.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {grouped.length} categories · {products.length} products
          </span>
          <button
            onClick={expandAll}
            className="underline hover:text-green-700"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="underline hover:text-green-700"
          >
            Collapse all
          </button>
        </div>
      )}
      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-green-600 inline" />
        </div>
      )}
      {!loading && grouped.length === 0 && (
        <p className="text-center text-gray-400 py-12">No products found</p>
      )}
      {}
      <div className="space-y-4">
        {!loading &&
          grouped.map(({ name, items }) => {
            const isOpen = openCategories.has(name);
            return (
              <div
                key={name}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(name)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="font-semibold text-gray-800 text-sm">
                      {name}
                    </span>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {items.length}{" "}
                      {items.length === 1 ? "product" : "products"}
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>{TABLE_HEAD}</thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((p) => (
                          <ProductRow
                            key={p.id}
                            p={p}
                            variants={p._variants}
                            onEdit={setModal}
                            onDelete={handleDelete}
                            deleting={deleting}
                            onToggleFeatured={handleToggleFeatured}
                            togglingFeatured={togglingFeatured}
                            onToggleActive={handleToggleActive}
                            togglingActive={togglingActive}
                            onAddVariant={(parent) => setModal({ _variantParent: parent })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      {}
      {modal && (
        modal?._variantParent ? (
          <VariantModal
            parent={modal._variantParent}
            onClose={() => setModal(null)}
            onSaved={onSaved}
          />
        ) : (
          <ProductModal
            product={modal === "add" ? null : modal}
            categories={categories}
            allProducts={products}
            onClose={() => setModal(null)}
            onSaved={onSaved}
          />
        )
      )}
    </div>
  );
}
function OrdersTab() {
  const { toast } = useDialog();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const LIMIT = 20;
  const load = useCallback(
    async (f = filter, p = page, silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const params = { limit: LIMIT, page: p, sort: "created_at_desc" };
        if (f !== "all") params.status = f;
        const res = await api.get("/orders", params);
        setOrders(res.data || []);
        setTotal(res.meta?.totalItems || res.meta?.total || 0);
      } catch (e) {
        setError(e.message || "Failed to load orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, page],
  );
  const handleRefresh = async () => {
    setRefreshing(true);
    await load(filter, page, true);
  };
  useEffect(() => {
    load();
    const interval = setInterval(() => load(filter, page, true), 30000);
    return () => clearInterval(interval);
  }, [page, filter, load]);
  async function updateStatus(orderId, status) {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    } catch (e) {
      toast(e.message || "Update failed", "error");
    } finally {
      setUpdating(null);
    }
  }
  const totalPages = Math.ceil(total / LIMIT);
  const filters = ["all", ...ORDER_STATUSES];
  return (
    <div className="space-y-5">
      {}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${filter === f ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}
            >
              {f === "all" ? "All Orders" : STATUS_LABELS[f] || f}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          <RefreshCcw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600 inline" />
                  </td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No orders found
                  </td>
                </tr>
              )}
              {!loading &&
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-green-700 font-semibold">
                      #{o.order_number || o.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {o.customer_name || o.user?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {o.user?.phone || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.total_items ?? o.items?.length ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ₹{parseFloat(o.total_amount || 0).toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={o.status}
                          disabled={
                            updating === o.id ||
                            VALID_TRANSITIONS[o.status]?.length === 0
                          }
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="appearance-none pr-7 pl-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 cursor-pointer"
                        >
                          {}
                          <option value={o.status}>
                            {STATUS_LABELS[o.status] || o.status}
                          </option>
                          {}
                          {(VALID_TRANSITIONS[o.status] || []).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s] || s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        {updating === o.id && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-green-600" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {/* Professional Pagination */}
        {totalPages >= 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500 shrink-0">
              Showing{" "}
              <span className="font-bold text-gray-800">
                {total === 0 ? 0 : (page - 1) * LIMIT + 1}
              </span>
              {"–"}
              <span className="font-bold text-gray-800">
                {Math.min(page * LIMIT, total)}
              </span>
              {" of "}
              <span className="font-bold text-gray-800">{total}</span>
              {" orders"}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  title="First"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 text-xs font-bold disabled:opacity-30 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                >
                  &#171;
                </button>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  title="Previous"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
                {(() => {
                  const nums = [];
                  const delta = 2;
                  const range = [];
                  for (
                    let i = Math.max(2, page - delta);
                    i <= Math.min(totalPages - 1, page + delta);
                    i++
                  )
                    range.push(i);
                  nums.push(1);
                  if (range[0] > 2) nums.push("ellL");
                  range.forEach((n) => nums.push(n));
                  if (range[range.length - 1] < totalPages - 1)
                    nums.push("ellR");
                  if (totalPages > 1) nums.push(totalPages);
                  return nums.map((n) =>
                    typeof n === "string" ? (
                      <span
                        key={n}
                        className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 select-none"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border ${page === n ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"}`}
                      >
                        {n}
                      </button>
                    ),
                  );
                })()}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  title="Next"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 text-xs font-bold disabled:opacity-30 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                >
                  &#187;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function UsersTab() {
  const { confirm, toast } = useDialog();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);
  const searchTimer = useRef(null);
  const LIMIT = 20;
  const load = useCallback(
    async (q = search, p = page, type = typeFilter, status = statusFilter) => {
      setLoading(true);
      setError("");
      try {
        if (status === "deleted") {
          const params = { page: p, limit: LIMIT };
          if (q) params.search = q;
          const res = await api.get("/users/deleted", params);
          setUsers(res.data || []);
          setTotal(res.meta?.totalItems || res.meta?.total || 0);
        } else {
          const params = { page: p, limit: LIMIT };
          if (q) params.search = q;
          if (type !== "all") params.user_type = type;
          if (status === "active") params.is_active = true;
          if (status === "blocked") params.is_active = false;
          const res = await api.get("/users", params);
          setUsers(res.data || []);
          setTotal(res.meta?.totalItems || res.meta?.total || 0);
        }
      } catch (e) {
        setError(e.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [search, page, typeFilter, statusFilter],
  );
  useEffect(() => {
    load();
  }, [page, typeFilter, statusFilter]);
  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(val, 1, typeFilter, statusFilter);
    }, 400);
  }
  async function toggleBlock(user) {
    setActing(user.id);
    try {
      if (user.is_blocked) await api.put(`/users/${user.id}/unblock`);
      else await api.put(`/users/${user.id}/block`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u,
        ),
      );
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally {
      setActing(null);
    }
  }
  async function toggleActive(user) {
    setActing(user.id);
    try {
      if (user.is_active) await api.put(`/users/${user.id}/deactivate`);
      else await api.put(`/users/${user.id}/activate`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: !u.is_active } : u,
        ),
      );
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally {
      setActing(null);
    }
  }
  async function handleDelete(id) {
    if (
      !(await confirm("Move this user to trash? They can be restored later.", {
        danger: true,
        confirmLabel: "Delete",
        title: "Delete User",
      }))
    )
      return;
    setActing(id);
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      toast(e.message || "Delete failed", "error");
    } finally {
      setActing(null);
    }
  }
  async function handleRestore(id) {
    if (
      !(await confirm("Restore this user? Their account will be reactivated.", {
        confirmLabel: "Restore",
        title: "Restore User",
      }))
    )
      return;
    setActing(id);
    try {
      await api.put(`/users/${id}/restore`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setTotal((t) => t - 1);
      toast("User restored successfully", "success");
    } catch (e) {
      toast(e.message || "Restore failed", "error");
    } finally {
      setActing(null);
    }
  }
  async function handlePromoteDemote(user) {
    const isCurrentlyRetail = user.user_type === "retail";
    const newType = isCurrentlyRetail ? "wholesale" : "retail";
    const action = isCurrentlyRetail
      ? "Promote to Wholesale"
      : "Demote to Retail";

    if (
      !(await confirm(`${action} customer: ${user.name || user.phone}?`, {
        confirmLabel: action,
        danger: !isCurrentlyRetail,
      }))
    )
      return;

    setActing(user.id);
    try {
      await api.put(`/users/${user.id}/customer-type`, {
        customer_type: newType,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, user_type: newType } : u)),
      );
    } catch (e) {
      toast(e.message || "Failed to update customer type", "error");
    } finally {
      setActing(null);
    }
  }
  const totalPages = Math.ceil(total / LIMIT);
  return (
    <div className="space-y-5">
      {}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {}
          {["all", "customer", "admin"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTypeFilter(t);
                setPage(1);
              }}
              className={`capitalize px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${typeFilter === t ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
          <div className="w-px bg-gray-200" />
          {}
          {["all", "active", "blocked", "deleted"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`capitalize px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${statusFilter === s ? (s === "deleted" ? "bg-red-600 text-white" : "bg-blue-600 text-white") : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"}`}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600 inline" />
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-gray-50 transition-colors ${u.deleted_at ? "bg-red-50 opacity-80" : ""}`}
                  >
                    {}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {(u.name || u.phone || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {u.name || (
                              <span className="text-gray-400 italic">
                                No name
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {u.id?.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>
                    {}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {u.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {u.phone}
                          </div>
                        )}
                        {u.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {u.email}
                          </div>
                        )}
                      </div>
                    </td>
                    {}
                    <td className="px-4 py-3">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-xs font-semibold
                      ${
                        u.user_type === "admin" || u.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                      >
                        {u.user_type || u.role || "customer"}
                      </span>
                    </td>
                    {}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {u.deleted_at ? (
                          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Deleted
                          </span>
                        ) : u.is_blocked ? (
                          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Blocked
                          </span>
                        ) : (
                          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Active
                          </span>
                        )}
                        {!u.deleted_at && !u.is_active && (
                          <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Inactive
                          </span>
                        )}
                        {(u.user_type === "retail" ||
                          u.user_type === "wholesale") && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit
                            ${u.user_type === "wholesale" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}
                          >
                            {u.user_type === "wholesale"
                              ? "Wholesale"
                              : "Retail"}
                          </span>
                        )}
                      </div>
                    </td>
                    {}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.deleted_at ? (
                        <span className="text-red-500 font-medium">
                          Deleted {fmtDate(u.deleted_at)}
                        </span>
                      ) : (
                        fmtDate(u.created_at)
                      )}
                    </td>
                    {}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {acting === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                        ) : u.deleted_at ? (
                          // Deleted user — show only Restore button
                          <button
                            onClick={() => handleRestore(u.id)}
                            title="Restore user"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        ) : (
                          <>
                            {/* Promote/Demote (only for retail/wholesale customers) */}
                            {(u.user_type === "retail" ||
                              u.user_type === "wholesale") && (
                              <button
                                onClick={() => handlePromoteDemote(u)}
                                title={
                                  u.user_type === "retail"
                                    ? "Promote to Wholesale"
                                    : "Demote to Retail"
                                }
                                className={`p-1.5 rounded-lg transition-colors
                                  ${
                                    u.user_type === "wholesale"
                                      ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                      : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                  }`}
                              >
                                {u.user_type === "retail" ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {}
                            <button
                              onClick={() => toggleBlock(u)}
                              title={u.is_blocked ? "Unblock" : "Block"}
                              className={`p-1.5 rounded-lg transition-colors
                              ${
                                u.is_blocked
                                  ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                                  : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                            >
                              {u.is_blocked ? (
                                <UserCheck className="w-4 h-4" />
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                            </button>
                            {}
                            <button
                              onClick={() => toggleActive(u)}
                              title={u.is_active ? "Deactivate" : "Activate"}
                              className={`p-1.5 rounded-lg transition-colors
                              ${
                                u.is_active
                                  ? "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                                  : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                              }`}
                            >
                              {u.is_active ? (
                                <ShieldOff className="w-4 h-4" />
                              ) : (
                                <ShieldCheck className="w-4 h-4" />
                              )}
                            </button>
                            {}
                            <button
                              onClick={() => handleDelete(u.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{total} users</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 text-gray-500">
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
const PROMO_TYPES = [
  {
    value: "flash_sale",
    label: "Flash Sale",
    color: "bg-red-100 text-red-700",
  },
  {
    value: "limited_time",
    label: "Limited Time",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "festival",
    label: "Festival",
    color: "bg-purple-100 text-purple-700",
  },
  { value: "seasonal", label: "Seasonal", color: "bg-blue-100 text-blue-700" },
  {
    value: "recurring",
    label: "Recurring",
    color: "bg-teal-100 text-teal-700",
  },
];
const QUICK_DURATIONS = [
  { label: "1 Day", hours: 24 },
  { label: "2 Days", hours: 48 },
  { label: "3 Days", hours: 72 },
  { label: "1 Week", hours: 168 },
  { label: "2 Weeks", hours: 336 },
  { label: "1 Month", hours: 720 },
];
function promoStatus(p) {
  const now = new Date();
  if (new Date(p.ends_at) < now) return "expired";
  if (new Date(p.starts_at) > now) return "upcoming";
  return "active";
}
function PromoStatusBadge({ promo }) {
  const s = promoStatus(promo);
  const styles = {
    active: "bg-green-100 text-green-700",
    upcoming: "bg-blue-100 text-blue-700",
    expired: "bg-gray-100 text-gray-500",
  };
  const labels = {
    active: "Active Now",
    upcoming: "Upcoming",
    expired: "Expired",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[s]}`}
    >
      {labels[s]}
    </span>
  );
}
/* ── Festival presets ─────────────────────────────────── */
const FESTIVAL_PRESETS = [
  {
    name: "Diwali",
    color: "#c05621",
    badge: "DIWALI SPECIAL",
    title: "Diwali Mega Sale",
    desc: "Celebrate the festival of lights with exclusive deals on sweets, snacks & home essentials.",
    discount: 30,
    banner_text:
      "🪔 Diwali Mega Sale — Up to 30% Off! Shop sweets, snacks & home essentials now.",
    keywords: ["sweet", "snack", "oil", "ghee"],
  },
  {
    name: "Holi",
    color: "#7c3aed",
    badge: "HOLI SALE",
    title: "Holi Festival Sale",
    desc: "Play with colours and savings! Discounts on snacks, drinks & festive must-haves.",
    discount: 25,
    banner_text:
      "🎨 Holi Sale — Up to 25% Off on snacks, drinks & festive must-haves!",
    keywords: ["snack", "juice", "drink", "colour"],
  },
  {
    name: "Eid",
    color: "#047857",
    badge: "EID MUBARAK",
    title: "Eid Special Sale",
    desc: "Eid Mubarak! Special discounts on sweets, dry fruits & daily essentials.",
    discount: 20,
    banner_text:
      "🌙 Eid Mubarak — 20% Off on sweets, dry fruits & daily essentials!",
    keywords: ["dry fruit", "dates", "sweet", "biryani"],
  },
  {
    name: "Pongal",
    color: "#b45309",
    badge: "PONGAL OFFER",
    title: "Pongal Harvest Sale",
    desc: "Happy Pongal! Special deals on rice, jaggery, dal & all harvest essentials.",
    discount: 20,
    banner_text:
      "🌾 Happy Pongal — 20% Off on rice, jaggery, dal & harvest essentials!",
    keywords: ["rice", "jaggery", "dal", "sugarcane"],
  },
  {
    name: "Christmas",
    color: "#166534",
    badge: "XMAS SPECIAL",
    title: "Christmas Sale",
    desc: "Merry Christmas! Great deals on cakes, chocolates & holiday treats.",
    discount: 15,
    banner_text:
      "🎄 Merry Christmas — 15% Off on cakes, chocolates & holiday treats!",
    keywords: ["cake", "chocolate", "biscuit", "dry fruit"],
  },
  {
    name: "Onam",
    color: "#9a3412",
    badge: "ONAM SPECIAL",
    title: "Onam Harvest Sale",
    desc: "Happy Onam! Celebrate with deals on rice, snacks & Kerala essentials.",
    discount: 20,
    banner_text: "🌸 Happy Onam — 20% Off on rice, snacks & Kerala essentials!",
    keywords: ["rice", "coconut", "banana", "papad"],
  },
  {
    name: "Ugadi",
    color: "#15803d",
    badge: "UGADI SPECIAL",
    title: "Ugadi New Year Sale",
    desc: "Happy Ugadi! Start the Telugu New Year with fresh deals on groceries & festive essentials.",
    discount: 20,
    banner_text: "🌿 Happy Ugadi — 20% Off on groceries & festive essentials!",
    keywords: ["tamarind", "jaggery", "dal", "mango"],
  },
  {
    name: "Vinayaka Chavithi",
    color: "#d97706",
    badge: "CHAVITHI OFFER",
    title: "Vinayaka Chavithi Sale",
    desc: "Special offers on modak ingredients, fruits & puja essentials.",
    discount: 15,
    banner_text:
      "🐘 Vinayaka Chavithi — 15% Off on modak ingredients, fruits & puja items!",
    keywords: ["modak", "coconut", "jaggery", "fruit"],
  },
  {
    name: "Dasara",
    color: "#6d28d9",
    badge: "DASARA SALE",
    title: "Dasara Navratri Sale",
    desc: "Dasara celebrations with big discounts on groceries & daily essentials.",
    discount: 25,
    banner_text:
      "🏹 Dasara Sale — Up to 25% Off on groceries & daily essentials!",
    keywords: ["rice", "dal", "oil", "spice"],
  },
  {
    name: "Navratri",
    color: "#e11d48",
    badge: "NAVRATRI OFFER",
    title: "Navratri Special Sale",
    desc: "Nine nights of amazing deals on pooja items, dry fruits & festive snacks.",
    discount: 20,
    banner_text:
      "🪔 Navratri Special — 20% Off on dry fruits, pooja items & festive snacks!",
    keywords: ["dry fruit", "sabudana", "almond", "cashew"],
  },
  {
    name: "Bathukamma",
    color: "#c026d3",
    badge: "BATHUKAMMA",
    title: "Bathukamma Festival Sale",
    desc: "Celebrate the Telangana flower festival with great deals on essentials.",
    discount: 15,
    banner_text:
      "🌼 Bathukamma Festival — 15% Off on daily essentials & festive items!",
    keywords: ["rice", "snack", "oil", "dal"],
  },
  {
    name: "Rama Navami",
    color: "#d97706",
    badge: "RAMA NAVAMI",
    title: "Sri Rama Navami Sale",
    desc: "Celebrate Sri Rama Navami with discounts on prasad items & daily essentials.",
    discount: 15,
    banner_text:
      "🙏 Sri Rama Navami — 15% Off on prasad items & daily essentials!",
    keywords: ["panakam", "sweet", "jaggery", "milk"],
  },
  {
    name: "Independence Day",
    color: "#1d4ed8",
    badge: "AZADI KA AMRIT",
    title: "Independence Day Sale",
    desc: "Celebrating our nation's freedom with special discounts on all essentials.",
    discount: 20,
    banner_text:
      "🇮🇳 Independence Day Sale — 20% Off on all essentials. Jai Hind!",
    keywords: ["rice", "dal", "oil", "atta"],
  },
  {
    name: "Republic Day",
    color: "#1d4ed8",
    badge: "REPUBLIC DAY",
    title: "Republic Day Sale",
    desc: "75+ years of Republic India — great deals on all categories.",
    discount: 15,
    banner_text:
      "🇮🇳 Republic Day Sale — 15% Off across all categories. Jai Bharat!",
    keywords: ["rice", "dal", "oil", "biscuit"],
  },
];

/* ── Countdown for live preview ──────────────────────── */
function PromoCountdown({ endTime, color, compact = false }) {
  const calc = () => {
    const diff = Math.max(0, endTime - Date.now());
    return {
      h: Math.floor((diff % 86_400_000) / 3_600_000),
      m: Math.floor((diff % 3_600_000) / 60_000),
      s: Math.floor((diff % 60_000) / 1_000),
    };
  };
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const p = (n) => String(n).padStart(2, "0");
  if (compact)
    return (
      <div className="text-[11px] font-mono font-bold mt-1" style={{ color }}>
        ⏱ {p(t.h)}:{p(t.m)}:{p(t.s)}
      </div>
    );
  return (
    <div className="flex gap-2 mt-2">
      {[
        { v: p(t.h), l: "HRS" },
        { v: p(t.m), l: "MIN" },
        { v: p(t.s), l: "SEC" },
      ].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border-2 bg-white text-gray-800"
            style={{ borderColor: color }}
          >
            {v}
          </div>
          <span className="text-[8px] text-gray-400 mt-0.5 tracking-widest">
            {l}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Live preview panel ──────────────────────────────── */
function PromoLivePreview({ form, mode, onModeChange }) {
  const accent = form.theme_color || "#FF6B00";
  const title = form.title || "Promotion Title";
  const discountText = form.discount_value
    ? form.discount_type === "percentage"
      ? `Up to ${form.discount_value}% Off`
      : `Flat \u20b9${form.discount_value} Off`
    : "Special Discount";
  const desc = form.description || "Get the best deals this season.";
  const badge = form.badge_text || "SPECIAL OFFER";
  const endsAt = form.ends_at
    ? new Date(form.ends_at).getTime()
    : Date.now() + 12 * 3600_000;

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 p-1 rounded-lg self-start">
        {["banner", "card"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
              mode === m
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "banner" ? (
        <div
          className="rounded-2xl overflow-hidden shadow border border-gray-200 flex-1"
          style={{ background: "#fff4e6" }}
        >
          <div className="p-5 flex flex-col gap-3">
            <span
              className="inline-flex items-center text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-full w-fit border"
              style={{
                background: accent + "18",
                borderColor: accent + "60",
                color: accent,
              }}
            >
              {badge}
            </span>
            <div>
              <p className="text-xl font-extrabold text-gray-900 leading-tight">
                {title}
              </p>
              <p
                className="text-lg font-extrabold leading-tight"
                style={{ color: accent }}
              >
                {discountText}
              </p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {desc}
            </p>
            <PromoCountdown endTime={endsAt} color={accent} />
            <div className="flex gap-2">
              <span
                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: accent }}
              >
                Shop Now →
              </span>
              <span
                className="px-4 py-2 rounded-xl text-xs font-semibold border-2 text-gray-700"
                style={{ borderColor: accent }}
              >
                View Offers
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl border-2 overflow-hidden shadow flex-1"
          style={{ borderColor: accent }}
        >
          <div className="h-1.5 w-full" style={{ background: accent }} />
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: accent + "20", color: accent }}
              >
                {badge}
              </span>
              {form.is_active && (
                <span className="text-[9px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ● Live
                </span>
              )}
            </div>
            <p className="text-lg font-extrabold text-gray-900 leading-snug">
              {title}
            </p>
            <p className="text-xl font-black" style={{ color: accent }}>
              {discountText}
            </p>
            <p className="text-xs text-gray-500 line-clamp-2">{desc}</p>
            <PromoCountdown endTime={endsAt} color={accent} compact />
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center mt-3">
        Live preview — updates as you type
      </p>
    </div>
  );
}

function PromotionModal({ promo, onClose, onSaved }) {
  const isEdit = !!promo;
  const [previewMode, setPreviewMode] = useState("banner");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const toLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({
    title: promo?.title || "",
    description: promo?.description || "",
    type: promo?.type || "limited_time",
    discount_type: promo?.discount_type || "percentage",
    discount_value: promo?.discount_value || "",
    min_order_amount: promo?.min_order_amount || "",
    reward_type: promo?.reward_type || "cash_off",
    free_product_id: promo?.free_product_id || "",
    banner_image_url: promo?.banner_image_url || "",
    banner_text: promo?.banner_text || "",
    theme_color: promo?.theme_color || "#FF6B00",
    badge_text: promo?.badge_text || "LIMITED OFFER",
    starts_at: toLocal(promo?.starts_at) || "",
    ends_at: toLocal(promo?.ends_at) || "",
    is_active: promo?.is_active !== false,
    priority: promo?.priority ?? 0,
    recurrence_rule: promo?.recurrence_rule || "",
  });
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef(null);
  const [freeProductSearch, setFreeProductSearch] = useState("");
  const [freeProductResults, setFreeProductResults] = useState([]);
  const [freeProductSelected, setFreeProductSelected] = useState(
    promo?.free_product_id
      ? {
          id: promo.free_product_id,
          name: promo.free_product_name || promo.free_product_id,
          image_url: promo.free_product_image || null,
          variant: promo.free_product_variant || null,
        }
      : null,
  );
  const freeSearchTimer = useRef(null);
  const handleFreeProductSearch = (val) => {
    setFreeProductSearch(val);
    clearTimeout(freeSearchTimer.current);
    if (!val || val.length < 2) {
      setFreeProductResults([]);
      return;
    }
    freeSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get("/products", {
          search: val,
          limit: 20,
          is_active: true,
        });
        setFreeProductResults(res.data || []);
      } catch {
        setFreeProductResults([]);
      }
    }, 300);
  };
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [selectedProductGroup, setSelectedProductGroup] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [suggestingProducts, setSuggestingProducts] = useState(false);
  const [suggestedForFestival, setSuggestedForFestival] = useState(null);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState("");
  useEffect(() => {
    if (isEdit && promo?.id) {
      setLoadingProducts(true);
      api
        .get(`/promotions/${promo.id}`)
        .then((res) => {
          const fullPromo = res.data;
          setSelectedProducts(
            fullPromo?.product_ids?.map((p) =>
              typeof p === "string"
                ? { id: p, deal_limit: null, item_limit: null }
                : {
                    id: p.id,
                    name: p.name,
                    image_url: p.image_url,
                    variant: p.variant,
                    deal_limit: p.deal_limit ?? null,
                    item_limit: p.item_limit ?? null,
                  },
            ) || [],
          );
        })
        .catch(() => setSelectedProducts([]))
        .finally(() => setLoadingProducts(false));
    }
  }, [isEdit, promo?.id]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const applyPreset = (preset) => {
    const start = new Date();
    const end = new Date(start.getTime() + 72 * 3600_000);
    setForm((p) => ({
      ...p,
      title: preset.title,
      description: preset.desc,
      badge_text: preset.badge,
      theme_color: preset.color,
      discount_type: "percentage",
      discount_value: String(preset.discount),
      type: "festival",
      banner_text: preset.banner_text || "",
      starts_at: toLocal(start.toISOString()),
      ends_at: toLocal(end.toISOString()),
    }));
    // Auto-suggest products based on festival keywords
    if (preset.keywords?.length) {
      setSuggestingProducts(true);
      setSuggestedForFestival(null);
      Promise.all(
        preset.keywords.map((kw) =>
          api
            .get("/products", { search: kw, limit: 6, is_active: true })
            .then((r) => r.data || [])
            .catch(() => []),
        ),
      )
        .then((results) => {
          const seen = new Set();
          const suggested = results
            .flat()
            .filter((p) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            })
            .map((p) => ({
              id: p.id,
              name: p.name,
              image_url: p.image_url,
              variant: p.variant,
            }));
          if (suggested.length > 0) {
            setSelectedProducts(suggested);
            setSuggestedForFestival(preset.name);
          }
        })
        .finally(() => setSuggestingProducts(false));
    }
  };
  const applyDuration = (hours) => {
    const start = form.starts_at ? new Date(form.starts_at) : new Date();
    const end = new Date(start.getTime() + hours * 3600000);
    set("starts_at", toLocal(start.toISOString()));
    set("ends_at", toLocal(end.toISOString()));
  };
  const searchProducts = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get("/products", {
        search: q,
        limit: 30,
        is_active: true,
      });
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    }
  }, []);
  const handleProductSearch = (val) => {
    setProductSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchProducts(val), 300);
  };
  const groupedResults = useMemo(() => {
    const groups = {};
    searchResults.forEach((p) => {
      const key = `${p.brand || ""}_${p.name}`.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = { name: p.name, brand: p.brand, variants: [] };
      }
      groups[key].variants.push(p);
    });
    return Object.values(groups);
  }, [searchResults]);
  const handleProductClick = (group) => {
    if (group.variants.length === 1) {
      addProducts([group.variants[0]]);
    } else {
      setSelectedProductGroup(group);
      setSelectedVariants(new Set());
      setShowVariantSelector(true);
    }
  };
  const addProducts = (products) => {
    const newProducts = products
      .filter((p) => !selectedProducts.find((x) => x.id === p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        variant: p.variant,
        deal_limit: null, // default: unlimited (admin can set a number per product)
        item_limit: null, // default: unlimited units
      }));
    if (newProducts.length > 0) {
      setSelectedProducts((prev) => [...prev, ...newProducts]);
    }
    setProductSearch("");
    setSearchResults([]);
  };
  const updateProductDealLimit = (pid, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === pid
          ? {
              ...p,
              deal_limit:
                value === "" ? null : Math.max(1, parseInt(value) || 1),
            }
          : p,
      ),
    );
  };
  const updateProductItemLimit = (pid, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === pid
          ? {
              ...p,
              item_limit:
                value === "" ? null : Math.max(1, parseInt(value) || 1),
            }
          : p,
      ),
    );
  };
  const addSelectedVariants = () => {
    if (selectedProductGroup && selectedVariants.size > 0) {
      const variantsToAdd = selectedProductGroup.variants.filter((v) =>
        selectedVariants.has(v.id),
      );
      addProducts(variantsToAdd);
      setShowVariantSelector(false);
      setSelectedProductGroup(null);
      setSelectedVariants(new Set());
    }
  };
  const addAllVariants = () => {
    if (selectedProductGroup) {
      addProducts(selectedProductGroup.variants);
      setShowVariantSelector(false);
      setSelectedProductGroup(null);
      setSelectedVariants(new Set());
    }
  };
  const toggleVariant = (variantId) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  };
  const removeProduct = (pid) => {
    setSelectedProducts((prev) => prev.filter((x) => x.id !== pid));
  };
  const searchBannerImages = async () => {
    if (!imageSearchQuery.trim() || imageSearchQuery.length < 2) return;
    setImageSearchLoading(true);
    setImageSearchError("");
    try {
      const res = await fetch(
        `/api/banner-images?q=${encodeURIComponent(imageSearchQuery)}&num=12`,
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setImageSearchError(
            data.userMessage ||
              "Rate limit exceeded. Please try again later or enter image URLs manually.",
          );
        } else {
          setImageSearchError(
            data.userMessage ||
              data.error ||
              "Failed to search images. Please try again.",
          );
        }
        setImageSearchResults([]);
      } else {
        setImageSearchResults(data.results || []);
        if (data.results?.length === 0) {
          setImageSearchError("No images found. Try a different search term.");
        }
      }
    } catch (err) {
      console.error("Image search error:", err);
      setImageSearchError(
        "Network error. Please check your connection and try again.",
      );
      setImageSearchResults([]);
    } finally {
      setImageSearchLoading(false);
    }
  };
  const selectBannerImage = (url) => {
    set("banner_image_url", url);
    setShowImageSearch(false);
    setImageSearchQuery("");
    setImageSearchResults([]);
    setImageSearchError("");
  };
  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.starts_at) {
      setError("Start date is required");
      return;
    }
    if (!form.ends_at) {
      setError("End date is required");
      return;
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError("End must be after start");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        discount_value: parseFloat(form.discount_value) || 0,
        priority: parseInt(form.priority) || 0,
        min_order_amount:
          form.discount_type === "threshold"
            ? parseFloat(form.min_order_amount) || null
            : null,
        reward_type:
          form.discount_type === "threshold" ? form.reward_type || null : null,
        free_product_id:
          form.discount_type === "threshold" && form.reward_type === "free_item"
            ? form.free_product_id || null
            : null,
        product_ids: selectedProducts.map((p) => ({
          id: p.id,
          deal_limit: p.deal_limit ?? null,
          item_limit: p.item_limit ?? null,
        })),
      };
      if (isEdit) await api.put(`/promotions/${promo.id}`, payload);
      else await api.post("/promotions", payload);
      onSaved();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* ── Main split-panel modal ── */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            {isEdit ? "Edit Promotion" : "Create Promotion"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Festival presets scroll strip */}
        {!isEdit && (
          <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-orange-50/60">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">
              Quick Festival Presets — one click to fill
            </p>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {FESTIVAL_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  style={{
                    borderColor: preset.color,
                    color: form.title === preset.title ? "#fff" : preset.color,
                    background:
                      form.title === preset.title
                        ? preset.color
                        : preset.color + "14",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body: left form + right preview */}
        <div className="flex flex-1 min-h-0">
          {/* ── Left: scrollable form ── */}
          <form
            onSubmit={save}
            id="promo-form"
            className="flex-1 overflow-y-auto p-6 space-y-5"
          >
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}

            {/* Basic info */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Sankranti Special Sale"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe your promotion…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {PROMO_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Discount */}
            <div className="bg-orange-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Discount
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Type
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => set("discount_type", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                    <option value="threshold">
                      Threshold (Spend &amp; Save)
                    </option>
                  </select>
                </div>
                {form.discount_type !== "threshold" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Value{" "}
                      {form.discount_type === "percentage" ? "(%)" : "(₹)"}
                    </label>
                    <input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => set("discount_value", e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                  </div>
                )}
              </div>
              {form.discount_type === "threshold" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Min Cart Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={form.min_order_amount}
                      onChange={(e) => set("min_order_amount", e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Reward Type
                    </label>
                    <select
                      value={form.reward_type}
                      onChange={(e) => set("reward_type", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="cash_off">Cash Off (₹)</option>
                      <option value="percentage">Percentage Off (%)</option>
                      <option value="free_item">Free Item</option>
                    </select>
                  </div>
                  {(form.reward_type === "cash_off" ||
                    form.reward_type === "percentage") && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        {form.reward_type === "percentage"
                          ? "Discount (%) *"
                          : "Discount Amount (₹) *"}
                      </label>
                      <input
                        type="number"
                        value={form.discount_value}
                        onChange={(e) => set("discount_value", e.target.value)}
                        placeholder={
                          form.reward_type === "percentage"
                            ? "e.g. 10"
                            : "e.g. 50"
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                    </div>
                  )}
                  {form.reward_type === "free_item" && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Free Product *
                      </label>
                      {freeProductSelected ? (
                        <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2">
                          {freeProductSelected.image_url && (
                            <img
                              src={freeProductSelected.image_url}
                              alt=""
                              className="w-7 h-7 rounded object-contain bg-gray-50 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                            {freeProductSelected.name}
                            {freeProductSelected.variant && (
                              <span className="text-gray-400 ml-1 text-xs">
                                ({freeProductSelected.variant})
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFreeProductSelected(null);
                              set("free_product_id", "");
                              setFreeProductSearch("");
                            }}
                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            value={freeProductSearch}
                            onChange={(e) =>
                              handleFreeProductSearch(e.target.value)
                            }
                            placeholder="Search product to give free…"
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          />
                          {freeProductResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-20">
                              {freeProductResults.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setFreeProductSelected(p);
                                    set("free_product_id", p.id);
                                    setFreeProductSearch("");
                                    setFreeProductResults([]);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-orange-50 text-left text-sm border-b border-gray-50 last:border-0"
                                >
                                  <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                                    {p.image_url && (
                                      <img
                                        src={p.image_url}
                                        alt=""
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium">
                                      {p.name}
                                    </p>
                                    {p.variant && (
                                      <p className="text-xs text-gray-400">
                                        {p.variant}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400 flex-shrink-0">
                                    ₹{p.price}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4" /> Schedule
              </h3>
              <div className="flex flex-wrap gap-2">
                {QUICK_DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => applyDuration(d.hours)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Starts At *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => set("starts_at", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Ends At *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => set("ends_at", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-purple-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                <Gift className="w-4 h-4" /> Appearance
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Badge Text
                  </label>
                  <input
                    value={form.badge_text}
                    onChange={(e) => set("badge_text", e.target.value)}
                    placeholder="FESTIVAL SPECIAL"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Theme Color
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.theme_color}
                      onChange={(e) => set("theme_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border-0 cursor-pointer shrink-0"
                    />
                    <input
                      value={form.theme_color}
                      onChange={(e) => set("theme_color", e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-0"
                    />
                  </div>
                  {/* Preset color swatches from FESTIVAL_PRESETS */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      ...new Map(
                        FESTIVAL_PRESETS.map((p) => [p.color, p]),
                      ).values(),
                    ].map((p) => (
                      <button
                        key={p.color}
                        type="button"
                        title={p.name}
                        onClick={() => set("theme_color", p.color)}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                        style={{
                          background: p.color,
                          borderColor:
                            form.theme_color === p.color
                              ? "#1f2937"
                              : "transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Banner Text
                  </label>
                  <input
                    value={form.banner_text}
                    onChange={(e) => set("banner_text", e.target.value)}
                    placeholder="e.g. Massive Sankranti Sale — Up to 50% off!"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Banner Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={form.banner_image_url}
                      onChange={(e) => set("banner_image_url", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImageSearch(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors border border-purple-200"
                    >
                      <Search className="w-4 h-4" /> Search
                    </button>
                  </div>
                  {form.banner_image_url && (
                    <div className="mt-2 w-full h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                      <img
                        src={form.banner_image_url}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products — hidden for threshold promos */}
            {form.discount_type !== "threshold" && (
              <div className="bg-green-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-green-800 flex items-center gap-1.5 flex-wrap">
                  <Package className="w-4 h-4" />
                  Linked Products (
                  {loadingProducts || suggestingProducts
                    ? "…"
                    : selectedProducts.length}
                  )
                  {suggestingProducts && (
                    <span className="ml-1 text-[10px] font-normal text-green-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />{" "}
                      auto-suggesting for{" "}
                      {form.title ? form.title.split(" ")[0] : "festival"}…
                    </span>
                  )}
                  {!suggestingProducts &&
                    suggestedForFestival &&
                    selectedProducts.length > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        ✨ Based on {suggestedForFestival}
                        <button
                          type="button"
                          title="Clear suggested products"
                          onClick={() => {
                            setSelectedProducts([]);
                            setSuggestedForFestival(null);
                          }}
                          className="ml-0.5 text-amber-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    )}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={productSearch}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    placeholder="Search products to add…"
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                  {groupedResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto z-20">
                      {groupedResults.map((group, idx) => {
                        const first = group.variants[0];
                        const hasMultiple = group.variants.length > 1;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleProductClick(group)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 text-left text-sm border-b border-gray-50 last:border-0"
                          >
                            <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                              {first.image_url && (
                                <img
                                  src={first.image_url}
                                  alt=""
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {group.name}
                                </span>
                                {hasMultiple && (
                                  <span className="flex-shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {group.variants.length} variants
                                  </span>
                                )}
                              </div>
                              {hasMultiple && (
                                <p className="text-xs text-gray-400 truncate">
                                  {group.variants
                                    .map((v) => v.variant || v.unit_type)
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              )}
                              {!hasMultiple && first.variant && (
                                <p className="text-xs text-gray-400">
                                  {first.variant}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              ₹{first.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {(loadingProducts || suggestingProducts) && (
                  <div className="text-center py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600 inline" />
                  </div>
                )}
                {!loadingProducts &&
                  !suggestingProducts &&
                  selectedProducts.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {selectedProducts.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 bg-white border border-green-200 rounded-lg pl-2 pr-2 py-1.5"
                        >
                          {p.image_url && (
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-6 h-6 rounded object-contain bg-gray-50 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="flex-1 text-xs font-medium text-green-700 min-w-0 truncate">
                            {p.name || p.id.slice(0, 8)}
                            {p.variant && (
                              <span className="text-gray-400 ml-1">
                                ({p.variant})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <label className="text-[9px] text-orange-500 font-bold whitespace-nowrap">
                                Orders
                              </label>
                              <input
                                type="number"
                                min="1"
                                placeholder="∞"
                                value={p.deal_limit ?? ""}
                                onChange={(e) =>
                                  updateProductDealLimit(p.id, e.target.value)
                                }
                                title="Max orders that can use this deal (blank = unlimited)"
                                className="w-12 border border-orange-200 rounded px-1 py-0.5 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-orange-400"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-[9px] text-purple-500 font-bold whitespace-nowrap">
                                Units
                              </label>
                              <input
                                type="number"
                                min="1"
                                placeholder="∞"
                                value={p.item_limit ?? ""}
                                onChange={(e) =>
                                  updateProductItemLimit(p.id, e.target.value)
                                }
                                title="Max total units that can be sold at promo price (blank = unlimited)"
                                className="w-12 border border-purple-200 rounded px-1 py-0.5 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProduct(p.id)}
                            className="w-5 h-5 rounded-full bg-green-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <p className="text-[9px] text-gray-400 pl-1">
                        <span className="text-orange-500 font-bold">
                          Orders
                        </span>{" "}
                        = max orders getting the discount.{" "}
                        <span className="text-purple-500 font-bold">Units</span>{" "}
                        = max total units at promo price. Leave blank for
                        unlimited.
                      </p>
                    </div>
                  )}
                {!loadingProducts &&
                  !suggestingProducts &&
                  selectedProducts.length === 0 && (
                    <p className="text-xs text-gray-400">
                      No products linked — promotion will apply as a general
                      banner only.
                    </p>
                  )}
              </div>
            )}

            {/* Advanced toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                />
                Advanced Options
              </button>
              {showAdvanced && (
                <div className="mt-3 grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Priority (higher = shown first)
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) => set("priority", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                    />
                  </div>
                  {form.type === "recurring" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Recurrence Rule
                      </label>
                      <input
                        value={form.recurrence_rule}
                        onChange={(e) => set("recurrence_rule", e.target.value)}
                        placeholder="e.g. weekly, monthly"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promo_active"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="w-4 h-4 accent-orange-600"
                />
                <label htmlFor="promo_active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Promotion"}
              </button>
            </div>
          </form>

          {/* ── Right: sticky live preview ── */}
          <div className="w-72 flex-shrink-0 border-l border-gray-100 p-5 overflow-y-auto bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Live Preview
            </p>
            <PromoLivePreview
              form={form}
              mode={previewMode}
              onModeChange={setPreviewMode}
            />
          </div>
        </div>
      </div>

      {/* ── Image search modal ── */}
      {showImageSearch && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowImageSearch(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-600" /> Search Banner
                Images
              </h3>
              <button
                onClick={() => setShowImageSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchBannerImages()}
                  placeholder="e.g., festival sale banner, ugadi celebration, diwali offers..."
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  onClick={searchBannerImages}
                  disabled={imageSearchLoading || !imageSearchQuery.trim()}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {imageSearchLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Search
                    </>
                  )}
                </button>
              </div>
              {imageSearchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        Search Failed
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        {imageSearchError}
                      </p>
                    </div>
                    <button
                      onClick={() => setImageSearchError("")}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="overflow-y-auto max-h-[60vh]">
                {imageSearchResults.length === 0 &&
                  !imageSearchLoading &&
                  !imageSearchError && (
                    <div className="py-12 text-center text-gray-400">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium mb-1">
                        Search for banner images
                      </p>
                      <p className="text-xs mb-4">
                        Enter keywords like "festival sale", "ugadi
                        celebration", etc.
                      </p>
                      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2 inline-flex items-center gap-1.5">
                        <LightBulbIcon className="w-3.5 h-3.5 text-yellow-500 shrink-0" />{" "}
                        Tip: You can also paste direct image URLs in the field
                        above
                      </p>
                    </div>
                  )}
                {imageSearchLoading && (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 inline mb-3" />
                    <p className="text-sm text-gray-500">
                      Searching for images...
                    </p>
                  </div>
                )}
                {imageSearchResults.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {imageSearchResults.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => selectBannerImage(img.url)}
                        className="group relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all hover:scale-105 bg-gray-100"
                      >
                        <img
                          src={img.thumbnail || img.url}
                          alt={img.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-2 transition-opacity">
                            <Check className="w-5 h-5 text-purple-600" />
                          </div>
                        </div>
                        {img.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-xs text-white line-clamp-1">
                              {img.title}
                            </p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 text-center space-y-1">
                <p>Click on an image to select it as your banner</p>
                <p className="text-[10px]">
                  Note: Search quota is limited. You can also paste direct image
                  URLs instead.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Variant selector modal ── */}
      {showVariantSelector && selectedProductGroup && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowVariantSelector(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" /> Select Variants
              </h3>
              <button
                onClick={() => setShowVariantSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedProductGroup.name}
                </p>
                {selectedProductGroup.brand && (
                  <p className="text-xs text-gray-500">
                    Brand: {selectedProductGroup.brand}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {selectedProductGroup.variants.length} variants available
                </p>
              </div>
              <button
                type="button"
                onClick={addAllVariants}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors border border-green-200"
              >
                <Check className="w-4 h-4" /> Add All{" "}
                {selectedProductGroup.variants.length} Variants
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">
                    or select specific variants
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedProductGroup.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${selectedVariants.has(variant.id) ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300 bg-white"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVariants.has(variant.id)}
                      onChange={() => toggleVariant(variant.id)}
                      className="w-4 h-4 accent-green-600 rounded"
                    />
                    <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                      {variant.image_url && (
                        <img
                          src={variant.image_url}
                          alt=""
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {variant.variant || variant.unit_type || "Standard"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>₹{variant.price}</span>
                        {variant.stock_quantity > 0 ? (
                          <span className="text-green-600">• In stock</span>
                        ) : (
                          <span className="text-red-600">• Out of stock</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVariantSelector(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addSelectedVariants}
                  disabled={selectedVariants.size === 0}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add{" "}
                  {selectedVariants.size > 0 ? `${selectedVariants.size}` : ""}{" "}
                  Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function PromotionsTab() {
  const { confirm, toast } = useDialog();
  const { refresh: refreshContext } = usePromotions();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [filter, setFilter] = useState("all");
  const [resumeModal, setResumeModal] = useState(null); // promo to re-enable
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit: 200, sort_by: "starts_at", sort_order: "DESC" };
      if (filter !== "all") params.status = filter;
      const res = await api.get("/promotions", params);
      setPromotions(res.data || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);
  async function handleDelete(id) {
    if (
      !(await confirm("Delete this promotion?", {
        danger: true,
        confirmLabel: "Delete",
      }))
    )
      return;
    setDeleting(id);
    try {
      await api.delete(`/promotions/${id}`);
      load();
      refreshContext();
    } catch (e) {
      toast(e.message || "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }
  async function handleToggle(p) {
    // Disabling — no dialog needed
    if (p.is_active) {
      setToggling(p.id);
      try {
        await api.put(`/promotions/${p.id}/toggle-active`);
        load();
        refreshContext();
      } catch (e) {
        toast(e.message || "Toggle failed", "error");
      } finally {
        setToggling(null);
      }
      return;
    }
    // Re-enabling — ask the user what to do
    setResumeModal(p);
  }
  async function handleResumeChoice(p, choice) {
    setResumeModal(null);
    setToggling(p.id);
    try {
      if (choice === "continue") {
        // Just flip is_active back on, keep original schedule
        await api.put(`/promotions/${p.id}/toggle-active`);
      } else {
        // Start Over — same duration starting from now
        const durationMs = new Date(p.ends_at) - new Date(p.starts_at);
        const newStart = new Date();
        const newEnd = new Date(newStart.getTime() + durationMs);
        await api.put(`/promotions/${p.id}`, {
          starts_at: newStart.toISOString(),
          ends_at: newEnd.toISOString(),
          is_active: true,
        });
      }
      load();
      refreshContext();
      toast(
        choice === "continue"
          ? "Promotion resumed!"
          : "Promotion restarted from now!",
        "success",
      );
    } catch (e) {
      toast(e.message || "Failed to enable promotion", "error");
    } finally {
      setToggling(null);
    }
  }
  function onSaved() {
    setModal(null);
    load();
    refreshContext();
  }
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    );
  };
  const timeLeft = (endsAt) => {
    const diff = new Date(endsAt) - new Date();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hrs}h left`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m left`;
  };
  const FILTER_CHIPS = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "upcoming", label: "Upcoming" },
    { id: "expired", label: "Expired" },
  ];
  return (
    <div className="space-y-5">
      {}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === c.id
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-orange-600 inline" />
        </div>
      )}
      {!loading && promotions.length === 0 && (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No promotions found</p>
          <p className="text-xs text-gray-300 mt-1">
            Create one to get started with festival offers & flash sales
          </p>
        </div>
      )}
      {}
      {!loading && promotions.length > 0 && (
        <div className="grid gap-4">
          {promotions.map((p) => {
            const status = promoStatus(p);
            const typeInfo =
              PROMO_TYPES.find((t) => t.value === p.type) || PROMO_TYPES[1];
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  status === "active"
                    ? "border-orange-200 ring-1 ring-orange-100"
                    : status === "upcoming"
                      ? "border-blue-200"
                      : "border-gray-100 opacity-75"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                  {}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className="w-2 h-16 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.theme_color || "#FF6B00" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900 text-base truncate">
                          {p.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                        <PromoStatusBadge promo={p} />
                        {!p.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500">
                            DISABLED
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}
                        </span>
                        {status === "active" && (
                          <span className="flex items-center gap-1 text-orange-600 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {timeLeft(p.ends_at)}
                          </span>
                        )}
                        {p.product_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            {p.product_count} product
                            {p.product_count > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {parseFloat(p.discount_value) > 0 && (
                      <div className="text-center px-3 py-1.5 rounded-lg bg-orange-50">
                        <span className="text-xl font-bold text-orange-600">
                          {p.discount_type === "percentage"
                            ? `${p.discount_value}%`
                            : p.discount_type === "threshold"
                              ? `₹${parseFloat(p.min_order_amount || 0)}`
                              : `₹${p.discount_value}`}
                        </span>
                        <p className="text-[10px] text-orange-400 uppercase font-semibold">
                          {p.discount_type === "threshold" ? "min cart" : "off"}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={toggling === p.id}
                      title={p.is_active ? "Disable" : "Enable"}
                      className={`p-2 rounded-lg transition-colors ${p.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                    >
                      {toggling === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : p.is_active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setModal(p)}
                      className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {deleting === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {}
                {p.banner_text && (
                  <div className="px-5 pb-4">
                    <div
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                      style={{ backgroundColor: p.theme_color || "#FF6B00" }}
                    >
                      {p.banner_text}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {}
      {resumeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setResumeModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-orange-600" />
              </div>
              <button
                onClick={() => setResumeModal(null)}
                className="text-gray-400 hover:text-gray-600 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                Re-enable Promotion
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">
                  {resumeModal.title}
                </span>{" "}
                was paused. How would you like to resume?
              </p>
            </div>
            {/* Original schedule info */}
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600 mb-1">
                Original schedule
              </p>
              <p>Start: {fmtDate(resumeModal.starts_at)}</p>
              <p>End: &nbsp;&nbsp;{fmtDate(resumeModal.ends_at)}</p>
              {new Date(resumeModal.ends_at) < new Date() && (
                <p className="text-red-500 font-medium mt-1">
                  ⚠ Schedule has already expired
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleResumeChoice(resumeModal, "continue")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm font-semibold"
              >
                <Eye className="w-4 h-4" />
                Continue
                <span className="text-[10px] font-normal text-blue-500 text-center leading-tight">
                  Keep original dates
                </span>
              </button>
              <button
                onClick={() => handleResumeChoice(resumeModal, "start_over")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors text-sm font-semibold"
              >
                <Loader2 className="w-4 h-4" />
                Start Over
                <span className="text-[10px] font-normal text-orange-500 text-center leading-tight">
                  Reset to now, same duration
                </span>
              </button>
            </div>
            <button
              onClick={() => setResumeModal(null)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {}
      {modal && (
        <PromotionModal
          promo={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
/* ─── Store Settings Tab ─── */
function StoreSettingsTab() {
  const { toast } = useDialog();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/settings");
        const list = res.data || [];
        setSettings(list);
        const f = {};
        list.forEach((s) => (f[s.key] = s.value));
        setForm(f);
      } catch (e) {
        toast(e.message || "Failed to load settings", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/settings", { settings: form });
      const list = res.data || [];
      setSettings(list);
      toast("Settings saved successfully", "success");
    } catch (e) {
      toast(e.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Cog className="w-5 h-5 text-gray-500" />
            Store Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure delivery charges, handling fees, and minimum order amount.
            These values are shown to customers in the cart.
          </p>
        </div>
        <div className="px-6 py-5 space-y-6">
          {settings.map((s) => (
            <div key={s.key}>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                {s.label || s.key}
              </label>
              {s.description && (
                <p className="text-xs text-gray-400 mb-2">{s.description}</p>
              )}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[s.key] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [s.key]: e.target.value }))
                  }
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "billing", label: "Billing", icon: CircleDollarSign },
  { id: "promotions", label: "Promotions", icon: Megaphone },
  { id: "users", label: "Users", icon: Users },
  { id: "settings", label: "Settings", icon: Cog },
];
export default function AdminDashboard() {
  const { ready, admin } = useAdminGuard();
  const router = useRouter();
  const [tab, setTab] = useState("overview");

  function handleTabChange(tabId) {
    if (tabId === "billing") {
      router.push("/admin/billing");
    } else {
      setTab(tabId);
    }
  }

  function logout() {
    secureStorage.removeItem("token");
    secureStorage.removeItem("refreshToken");
    secureStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    router.push("/login");
  }
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* --- UPGRADED HEADER --- */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-lg bg-white/95">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-lg rounded-xl w-9 h-9 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              MK
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg text-gray-900 leading-tight">
                MK Reddy
              </span>
              <span className="text-[10px] text-gray-500 -mt-0.5 font-medium uppercase tracking-wider">
                Admin Panel
              </span>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-0.5 bg-gray-100/80 rounded-xl p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    tab === id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Store className="w-4 h-4" /> Store
            </Link>
            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {admin?.name || "Admin"}
                </p>
                <p className="text-[11px] text-gray-400">
                  {admin?.phone || ""}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {admin?.name?.split(" ")[0] || "Admin"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Here&apos;s what&apos;s happening with your store today
            </p>
          </div>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {tab === "overview" && <OverviewTab onSwitchTab={setTab} />}
        {tab === "products" && <ProductsTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "promotions" && <PromotionsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "settings" && <StoreSettingsTab />}
      </main>
    </div>
  );
}

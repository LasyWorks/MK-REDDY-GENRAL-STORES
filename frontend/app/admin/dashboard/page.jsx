"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Store,
  RefreshCcw,
  X,
  Check,
  Loader2,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldOff,
  Phone,
  Mail,
  Megaphone,
  CalendarClock,
  Clock,
  Eye,
  EyeOff,
  Tag,
  Gift,
  Bell,
  Activity,
} from "lucide-react";
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
import CategoriesTab from "@/components/admin/CategoriesTab";
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
function StatCard({ label, value, sub, icon: Icon, color }) {
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
function OverviewTab({ onSwitchTab }) {
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
      alert(e.message || "Update failed");
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
function ProductModal({ product, categories, onClose, onSaved }) {
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
    const category = categories.find(c => c.id === product.category_id);
    return category?.parent_id || product.category_id;
  };

  const [form, setForm] = useState({
    name_en: product?.name || "",
    brand: product?.brand || "",
    sku: product?.sku || "",
    mrp: product?.mrp || "",
    price: product?.price || "",
    stock_quantity: product?.stock_quantity ?? "",
    unit: product?.unit || "kg",
    category_id: product?.category_id || "",
    description_en: product?.description || "",
    is_active: product?.is_active !== false,
    is_featured: product?.is_featured || false,
  });

  const [parentCategoryId, setParentCategoryId] = useState(getParentCategoryId());
  const [imageUrls, setImageUrls] = useState(initImages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setImg = (i, val) =>
    setImageUrls((a) => a.map((u, idx) => (idx === i ? val : u)));
  const addImg = () => setImageUrls((a) => [...a, ""]);
  const removeImg = (i) =>
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
      const payload = { ...form, image_urls: imgs, image_url: imgs[0] || null };
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
                {isEdit ? "Change carefully - must be unique" : "Leave empty to auto-generate"}
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
              <input
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="kg / 500g / pcs"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
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
                  setParentCategoryId(e.target.value);
                  set("category_id", ""); // Reset subcategory
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— select parent —</option>
                {categories.filter(c => !c.parent_id).map((c) => (
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
                onChange={(e) => set("category_id", e.target.value)}
                disabled={!parentCategoryId}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— select subcategory —</option>
                {categories.filter(c => c.parent_id === parentCategoryId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {!parentCategoryId && (
                <p className="text-xs text-gray-400 mt-1">Select parent category first</p>
              )}
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
                <label htmlFor="is_featured" className="text-sm text-gray-700">
                  ⭐ Featured (show on homepage)
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
function ProductRow({
  p,
  onEdit,
  onDelete,
  deleting,
  onToggleFeatured,
  togglingFeatured,
}) {
  const mrp = parseFloat(p.mrp || 0);
  const price = parseFloat(p.price || 0);
  const disc = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const img = Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_url;
  return (
    <tr className="hover:bg-gray-50 transition-colors">
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
            <p className="font-medium text-gray-900 text-sm line-clamp-1">
              {p.name}
            </p>
            {p.brand && (
              <p className="text-xs text-gray-400">
                {p.brand} · {p.unit}
              </p>
            )}
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
            <span className="text-base leading-none">
              {p.is_featured ? "⭐" : "☆"}
            </span>
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
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [togglingFeatured, setTogglingFeatured] = useState(null);
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
          categories.length ? null : api.get("/categories", { limit: 200 }),
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
    if (!confirm("Delete this product?")) return;
    setDeleting(id);
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (e) {
      alert(e.message || "Delete failed");
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
      alert(e.message || "Failed to update featured status");
    } finally {
      setTogglingFeatured(null);
    }
  }
  function toggleCategory(name) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }
  const mainCatName = useMemo(() => {
    const byId = {};
    for (const c of categories) byId[c.id] = c;
    const resolve = (id) => {
      const c = byId[id];
      if (!c) return null;
      return c.parent_id ? resolve(c.parent_id) : c.name;
    };
    const map = {};
    for (const c of categories) map[c.id] = resolve(c.id);
    return map;
  }, [categories]);
  const grouped = useMemo(() => {
    const map = {};
    for (const p of products) {
      const key =
        p.category_id && mainCatName[p.category_id]
          ? mainCatName[p.category_id]
          : p.category_name || "Uncategorised";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, items }));
  }, [products, mainCatName]);
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
                            onEdit={setModal}
                            onDelete={handleDelete}
                            deleting={deleting}
                            onToggleFeatured={handleToggleFeatured}
                            togglingFeatured={togglingFeatured}
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
        <ProductModal
          product={modal === "add" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
function OrdersTab() {
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
      alert(e.message || "Update failed");
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
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{total} orders</span>
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
function UsersTab() {
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
        const params = { page: p, limit: LIMIT };
        if (q) params.search = q;
        if (type !== "all") params.user_type = type;
        if (status === "active") params.is_active = true;
        if (status === "blocked") params.is_active = false;
        const res = await api.get("/users", params);
        setUsers(res.data || []);
        setTotal(res.meta?.totalItems || res.meta?.total || 0);
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
      alert(e.message || "Action failed");
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
      alert(e.message || "Action failed");
    } finally {
      setActing(null);
    }
  }
  async function handleDelete(id) {
    if (!confirm("Permanently delete this user? This cannot be undone."))
      return;
    setActing(id);
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setActing(null);
    }
  }
  async function handlePromoteDemote(user) {
    const isCurrentlyRetail = user.user_type === "retail";
    const newType = isCurrentlyRetail ? "wholesale" : "retail";
    const action = isCurrentlyRetail ? "Promote to Wholesale" : "Demote to Retail";
    
    if (!confirm(`${action} customer: ${user.name || user.phone}?`)) return;
    
    setActing(user.id);
    try {
      await api.put(`/users/${user.id}/customer-type`, { customer_type: newType });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, user_type: newType } : u,
        ),
      );
    } catch (e) {
      alert(e.message || "Failed to update customer type");
    } finally {
      setActing(null);
    }
  }
  async function handlePromoteDemote(user) {
    const isCurrentlyRetail = user.user_type === "retail";
    const newType = isCurrentlyRetail ? "wholesale" : "retail";
    const action = isCurrentlyRetail ? "Promote to Wholesale" : "Demote to Retail";
    
    if (!confirm(`${action} customer: ${user.name || user.phone}?`)) return;
    
    setActing(user.id);
    try {
      await api.put(`/users/${user.id}/customer-type`, { customer_type: newType });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, user_type: newType } : u,
        ),
      );
    } catch (e) {
      alert(e.message || "Failed to update customer type");
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
          {["all", "active", "blocked"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`capitalize px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"}`}
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
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
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
                        {u.is_blocked ? (
                          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Blocked
                          </span>
                        ) : (
                          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Active
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                            Inactive
                          </span>
                        )}
                        {(u.user_type === "retail" || u.user_type === "wholesale") && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit
                            ${u.user_type === "wholesale" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
                            {u.user_type === "wholesale" ? "Wholesale" : "Retail"}
                          </span>
                        )}
                      </div>
                    </td>
                    {}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtDate(u.created_at)}
                    </td>
                    {}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {acting === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                        ) : (
                          <>
                            {/* Promote/Demote (only for retail/wholesale customers) */}
                            {(u.user_type === "retail" || u.user_type === "wholesale") && (
                              <button
                                onClick={() => handlePromoteDemote(u)}
                                title={u.user_type === "retail" ? "Promote to Wholesale" : "Demote to Retail"}
                                className={`p-1.5 rounded-lg transition-colors
                                  ${u.user_type === "wholesale"
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
function PromotionModal({ promo, onClose, onSaved }) {
  const isEdit = !!promo;
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
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [selectedProductGroup, setSelectedProductGroup] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
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
              typeof p === "string" ? { id: p } : p,
            ) || [],
          );
        })
        .catch(() => setSelectedProducts([]))
        .finally(() => setLoadingProducts(false));
    }
  }, [isEdit, promo?.id]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
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
      }));
    if (newProducts.length > 0) {
      setSelectedProducts((prev) => [...prev, ...newProducts]);
    }
    setProductSearch("");
    setSearchResults([]);
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
        product_ids: selectedProducts.map((p) => p.id),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            {isEdit ? "Edit Promotion" : "Create Promotion"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={save} className="p-6 space-y-5">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Priority (higher = shown first)
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          {}
          <div className="bg-orange-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
              <Tag className="w-4 h-4" /> Discount
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Discount Type
                </label>
                <select
                  value={form.discount_type}
                  onChange={(e) => set("discount_type", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Value {form.discount_type === "percentage" ? "(%)" : "(₹)"}
                </label>
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => set("discount_value", e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>
          </div>
          {}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" /> Schedule
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
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
            {form.type === "recurring" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Recurrence Rule
                </label>
                <input
                  value={form.recurrence_rule}
                  onChange={(e) => set("recurrence_rule", e.target.value)}
                  placeholder="e.g. weekly, monthly, yearly"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            )}
          </div>
          {}
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
                  placeholder="LIMITED OFFER"
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
                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                  />
                  <input
                    value={form.theme_color}
                    onChange={(e) => set("theme_color", e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Banner Text
                </label>
                <input
                  value={form.banner_text}
                  onChange={(e) => set("banner_text", e.target.value)}
                  placeholder="🎉 Massive Sankranti Sale — Up to 50% off!"
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>
                {form.banner_image_url && (
                  <div className="mt-2 w-full h-24 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
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
          {}
          <div className="bg-green-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Linked Products (
              {loadingProducts ? "..." : selectedProducts.length})
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
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto z-20">
                  {groupedResults.map((group, idx) => {
                    const firstVariant = group.variants[0];
                    const hasMultiple = group.variants.length > 1;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleProductClick(group)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 text-left text-sm border-b border-gray-50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                          {firstVariant.image_url && (
                            <img
                              src={firstVariant.image_url}
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
                          {!hasMultiple && firstVariant.variant && (
                            <p className="text-xs text-gray-400">
                              {firstVariant.variant}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          ₹{firstVariant.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {loadingProducts && (
              <div className="text-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-green-600 inline" />
              </div>
            )}
            {!loadingProducts && selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 bg-white border border-green-200 rounded-lg pl-1.5 pr-1 py-1 text-xs font-medium text-green-700"
                  >
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-5 h-5 rounded object-contain bg-gray-50"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="max-w-[160px] truncate">
                      {p.name || p.id.slice(0, 8)}
                      {p.variant && (
                        <span className="text-gray-400 ml-1">
                          ({p.variant})
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id)}
                      className="w-4 h-4 rounded-full bg-green-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {!loadingProducts && selectedProducts.length === 0 && (
              <p className="text-xs text-gray-400">
                No products linked — promotion will apply as a general banner
                only.
              </p>
            )}
          </div>
          {}
          <div className="flex items-center gap-4 pt-2">
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
      </div>
      {}
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
                <Search className="w-5 h-5 text-purple-600" />
                Search Banner Images
              </h3>
              <button
                onClick={() => setShowImageSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {}
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
              {}
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
              {}
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
                      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2 inline-block">
                        💡 Tip: You can also paste direct image URLs in the
                        field above
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
                  Note: Search quota is limited. You can always paste direct
                  image URLs instead.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {}
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
                <Package className="w-5 h-5 text-green-600" />
                Select Variants
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
              {}
              <button
                type="button"
                onClick={addAllVariants}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors border border-green-200"
              >
                <Check className="w-4 h-4" />
                Add All {selectedProductGroup.variants.length} Variants
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">
                    or select specific variants
                  </span>
                </div>
              </div>
              {}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedProductGroup.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedVariants.has(variant.id)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300 bg-white"
                    }`}
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
              {}
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
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [filter, setFilter] = useState("all");
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
    if (!confirm("Delete this promotion?")) return;
    setDeleting(id);
    try {
      await api.delete(`/promotions/${id}`);
      load();
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }
  async function handleToggle(id) {
    setToggling(id);
    try {
      await api.put(`/promotions/${id}/toggle-active`);
      load();
    } catch (e) {
      alert(e.message || "Toggle failed");
    } finally {
      setToggling(null);
    }
  }
  function onSaved() {
    setModal(null);
    load();
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
                            : `₹${p.discount_value}`}
                        </span>
                        <p className="text-[10px] text-orange-400 uppercase font-semibold">
                          off
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => handleToggle(p.id)}
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
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "billing", label: "Billing", icon: CircleDollarSign },
  { id: "promotions", label: "Promotions", icon: Megaphone },
  { id: "users", label: "Users", icon: Users },
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
              {greeting}, {admin?.name?.split(" ")[0] || "Admin"} 👋
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
      </main>
    </div>
  );
}

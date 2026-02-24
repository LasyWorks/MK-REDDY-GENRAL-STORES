"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut,
  TrendingUp, AlertTriangle, Search, Plus, Pencil, Trash2,
  ChevronDown, Store, RefreshCcw, X, Check, Loader2,
  CircleDollarSign, ArrowUpRight, ArrowDownRight,
  UserCheck, UserX, ShieldCheck, ShieldOff, Phone, Mail,
} from "lucide-react";
import ImageWithFallback from "@/components/common/ImageWithFallback";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";

// ── Auth guard ────────────────────────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const token = secureStorage.getItem("token");
    const raw   = secureStorage.getItem("user");
    if (!token || !raw) { router.replace("/login?redirect=/admin/dashboard"); return; }
    try {
      const user = JSON.parse(raw);
      if (user.user_type !== "admin" && user.role !== "admin") {
        router.replace("/"); return;
      }
      setAdmin(user);
      setReady(true);
    } catch { router.replace("/login?redirect=/admin/dashboard"); }
  }, [router]);

  return { ready, admin };
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:    "bg-yellow-100 text-yellow-700",
  confirmed:  "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped:    "bg-cyan-100 text-cyan-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ── Status options ────────────────────────────────────────────────────────────
const ORDER_STATUSES = ["pending","confirmed","processing","shipped","delivered","cancelled"];

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  const num = parseFloat(n || 0);
  if (num >= 10_00_000) return `₹${(num / 10_00_000).toFixed(1)}L`;
  if (num >= 1000)      return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4 items-start">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const [stats, setStats]       = useState(null);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      try {
        const [sRes, oRes] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/orders", { limit: 8, sort: "created_at_desc" }),
        ]);
        setStats(sRes.data);
        setOrders(oRes.data || []);
      } catch (e) { setError(e.message || "Failed to load dashboard"); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );
  if (error) return (
    <div className="text-center py-20 text-red-500">{error}</div>
  );

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products"  value={stats?.products?.total  ?? "—"} sub={`Limit: ${stats?.products?.limit}`}    icon={Package}          color="bg-blue-50 text-blue-600" />
        <StatCard label="Total Orders"    value={stats?.orders?.total    ?? "—"} sub={`Today: ${stats?.today?.orders ?? 0}`} icon={ShoppingCart}      color="bg-green-50 text-green-600" />
        <StatCard label="Revenue"         value={fmtCurrency(stats?.revenue?.total)} sub={`Today: ${fmtCurrency(stats?.today?.revenue)}`} icon={CircleDollarSign} color="bg-purple-50 text-purple-600" />
        <StatCard label="Customers"       value={stats?.customers?.total ?? "—"} sub={`Limit: ${stats?.customers?.limit}`}  icon={Users}            color="bg-orange-50 text-orange-600" />
      </div>

      {/* Pending / Completed chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          {stats?.orders?.pending ?? 0} Pending Orders
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm font-medium">
          <Check className="w-4 h-4" />
          {stats?.orders?.completed ?? 0} Completed
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm font-medium">
          <X className="w-4 h-4" />
          {stats?.orders?.cancelled ?? 0} Cancelled
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No orders yet</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-green-700 font-semibold">#{o.order_number || o.id?.slice(0,8)}</td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{o.customer_name || o.user?.name || "—"}</td>
                  <td className="px-6 py-4 text-gray-600">{o.total_items ?? o.items?.length ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-800 font-semibold">₹{parseFloat(o.total_amount || 0).toFixed(0)}</td>
                  <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                  <td className="px-6 py-4 text-gray-500">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT MODAL (Add / Edit)
// ═══════════════════════════════════════════════════════════════════════════════
function ProductModal({ product, categories, onClose, onSaved }) {
  const isEdit = !!product;

  // Build initial image list from product data
  const initImages = () => {
    if (Array.isArray(product?.image_urls) && product.image_urls.length)
      return product.image_urls.filter(Boolean);
    if (product?.image_url) return [product.image_url];
    return [""];
  };

  const [form, setForm] = useState({
    name_en:        product?.name      || "",
    brand:          product?.brand     || "",
    mrp:            product?.mrp       || "",
    price:          product?.price     || "",
    stock_quantity: product?.stock_quantity ?? "",
    unit:           product?.unit      || "kg",
    category_id:    product?.category_id || "",
    description_en: product?.description || "",
    is_active:      product?.is_active !== false,
  });
  const [imageUrls, setImageUrls] = useState(initImages);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const setImg    = (i, val) => setImageUrls(a => a.map((u, idx) => idx === i ? val : u));
  const addImg    = () => setImageUrls(a => [...a, ""]);
  const removeImg = (i) => setImageUrls(a => a.length === 1 ? [""] : a.filter((_, idx) => idx !== i));
  const moveImg   = (i, dir) => setImageUrls(a => {
    const b = [...a]; const j = i + dir;
    if (j < 0 || j >= b.length) return b;
    [b[i], b[j]] = [b[j], b[i]]; return b;
  });

  async function save(e) {
    e.preventDefault();
    if (!form.name_en.trim()) { setError("Name is required"); return; }
    if (!form.price || !form.mrp) { setError("Price and MRP are required"); return; }
    setSaving(true); setError("");
    try {
      const imgs = imageUrls.filter(Boolean);
      const payload = { ...form, image_urls: imgs, image_url: imgs[0] || null };
      if (isEdit) await api.put(`/products/${product.id}`, payload);
      else         await api.post("/products", payload);
      onSaved();
    } catch (e) { setError(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">{isEdit ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            {/* ── Images ── */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Product Images</label>
                <button type="button" onClick={addImg}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Add Image
                </button>
              </div>
              <div className="space-y-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {url
                        ? <img src={url} alt={`img-${i}`}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={e => { e.currentTarget.style.display="none"; }} />
                        : <Package className="w-4 h-4 text-gray-300" />}
                    </div>
                    {/* Badge */}
                    {i === 0 && (
                      <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        Primary
                      </span>
                    )}
                    {/* URL input */}
                    <input
                      value={url}
                      onChange={e => setImg(i, e.target.value)}
                      placeholder="Paste image URL…"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {/* Move up */}
                    <button type="button" disabled={i === 0} onClick={() => moveImg(i, -1)}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 flex-shrink-0" title="Move up">
                      ▲
                    </button>
                    {/* Move down */}
                    <button type="button" disabled={i === imageUrls.length - 1} onClick={() => moveImg(i, 1)}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 flex-shrink-0" title="Move down">
                      ▼
                    </button>
                    {/* Remove */}
                    <button type="button" onClick={() => removeImg(i)}
                      className="text-gray-300 hover:text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">First image is the primary thumbnail. Use ▲▼ to reorder.</p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name *</label>
              <input value={form.name_en} onChange={e => set("name_en", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
              <input value={form.brand} onChange={e => set("brand", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
              <input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="kg / 500g / pcs"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">MRP (₹) *</label>
              <input type="number" value={form.mrp} onChange={e => set("mrp", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Selling Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => set("price", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock Qty</label>
              <input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">— select —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea rows={2} value={form.description_en} onChange={e => set("description_en", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)}
                className="w-4 h-4 accent-green-600" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible in store)</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ProductsTab() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [modal,      setModal]      = useState(null); // null | "add" | product obj
  const [deleting,   setDeleting]   = useState(null);
  const LIMIT = 20;
  const searchTimer = useRef(null);

  const load = useCallback(async (q = search, p = page) => {
    setLoading(true); setError("");
    try {
      const params = { page: p, limit: LIMIT };
      if (q) params.search = q;
      const [pRes, cRes] = await Promise.all([
        api.get("/products/admin/all", params),
        categories.length ? null : api.get("/categories", { limit: 200 }),
      ]);
      setProducts(pRes.data || []);
      setTotal(pRes.meta?.totalItems || pRes.meta?.total || 0);
      if (cRes) setCategories(cRes.data || []);
    } catch (e) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [search, page, categories.length]);

  useEffect(() => { load(); }, [page]);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1); }, 400);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    setDeleting(id);
    try { await api.delete(`/products/${id}`); load(); }
    catch (e) { alert(e.message || "Delete failed"); }
    finally { setDeleting(null); }
  }

  function onSaved() { setModal(null); load(); }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600 inline" />
                </td></tr>
              )}
              {!loading && products.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No products found</td></tr>
              )}
              {!loading && products.map((p) => {
                const mrp   = parseFloat(p.mrp   || 0);
                const price = parseFloat(p.price || 0);
                const disc  = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                const img   = Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_url;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
                          <ImageWithFallback src={img} alt={p.name} size="sm"
                            className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm line-clamp-1">{p.name}</p>
                          {p.brand && <p className="text-xs text-gray-400">{p.brand} · {p.unit}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3 text-green-700 text-xs font-medium">{p.category_name || "—"}</td>
                    {/* Price */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">₹{price}</span>
                      {mrp > price && <span className="ml-1 text-xs text-gray-400 line-through">₹{mrp}</span>}
                    </td>
                    {/* Discount */}
                    <td className="px-4 py-3">
                      {disc > 0
                        ? <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{disc}%</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-3">
                      {(p.stock_quantity ?? 0) > 0
                        ? <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{p.stock_quantity} In Stock</span>
                        : <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">Out of Stock</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          {deleting === p.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{total} products</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1 text-gray-500">Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
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

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OrdersTab() {
  const [orders,   setOrders]   = useState([]);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [updating, setUpdating] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async (f = filter, p = page) => {
    setLoading(true); setError("");
    try {
      const params = { limit: LIMIT, page: p, sort: "created_at_desc" };
      if (f !== "all") params.status = f;
      const res = await api.get("/orders", params);
      setOrders(res.data || []);
      setTotal(res.meta?.totalItems || res.meta?.total || 0);
    } catch (e) { setError(e.message || "Failed to load orders"); }
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { load(); }, [page, filter]);

  async function updateStatus(orderId, status) {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) { alert(e.message || "Update failed"); }
    finally { setUpdating(null); }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const filters = ["all", ...ORDER_STATUSES];

  return (
    <div className="space-y-5">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`capitalize px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${filter === f ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
            {f === "all" ? "All Orders" : f}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600 inline" />
                </td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">No orders found</td></tr>
              )}
              {!loading && orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-green-700 font-semibold">#{o.order_number || o.id?.slice(0,8)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{o.customer_name || o.user?.name || "—"}</p>
                    <p className="text-xs text-gray-400">{o.user?.phone || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{o.total_items ?? o.items?.length ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{parseFloat(o.total_amount || 0).toFixed(0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={o.status}
                        disabled={updating === o.id}
                        onChange={e => updateStatus(o.id, e.target.value)}
                        className="appearance-none pr-7 pl-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 cursor-pointer"
                      >
                        {ORDER_STATUSES.map(s => (
                          <option key={s} value={s} className="capitalize">{s}</option>
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
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1 text-gray-500">Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | customer | admin
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | blocked
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [acting,   setActing]   = useState(null); // userId being acted on
  const searchTimer = useRef(null);
  const LIMIT = 20;

  const load = useCallback(async (q = search, p = page, type = typeFilter, status = statusFilter) => {
    setLoading(true); setError("");
    try {
      const params = { page: p, limit: LIMIT };
      if (q)              params.search    = q;
      if (type !== "all") params.user_type = type;
      if (status === "active")  params.is_active = true;
      if (status === "blocked") params.is_active = false;
      const res = await api.get("/users", params);
      setUsers(res.data || []);
      setTotal(res.meta?.totalItems || res.meta?.total || 0);
    } catch (e) { setError(e.message || "Failed to load users"); }
    finally { setLoading(false); }
  }, [search, page, typeFilter, statusFilter]);

  useEffect(() => { load(); }, [page, typeFilter, statusFilter]);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1, typeFilter, statusFilter); }, 400);
  }

  async function toggleBlock(user) {
    setActing(user.id);
    try {
      if (user.is_blocked) await api.put(`/users/${user.id}/unblock`);
      else                  await api.put(`/users/${user.id}/block`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u));
    } catch (e) { alert(e.message || "Action failed"); }
    finally { setActing(null); }
  }

  async function toggleActive(user) {
    setActing(user.id);
    try {
      if (user.is_active) await api.put(`/users/${user.id}/deactivate`);
      else                 await api.put(`/users/${user.id}/activate`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (e) { alert(e.message || "Action failed"); }
    finally { setActing(null); }
  }

  async function handleDelete(id) {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    setActing(id);
    try { await api.delete(`/users/${id}`); setUsers(prev => prev.filter(u => u.id !== id)); setTotal(t => t - 1); }
    catch (e) { alert(e.message || "Delete failed"); }
    finally { setActing(null); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Type filter */}
          {["all","customer","admin"].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`capitalize px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${typeFilter === t ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
              {t === "all" ? "All Types" : t}
            </button>
          ))}
          <div className="w-px bg-gray-200" />
          {/* Status filter */}
          {["all","active","blocked"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`capitalize px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"}`}>
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600 inline" />
                </td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No users found</td></tr>
              )}
              {!loading && users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {(u.name || u.phone || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{u.name || <span className="text-gray-400 italic">No name</span>}</p>
                        <p className="text-xs text-gray-400">{u.id?.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {u.phone && <div className="flex items-center gap-1 text-xs text-gray-600"><Phone className="w-3 h-3 text-gray-400" />{u.phone}</div>}
                      {u.email && <div className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3 text-gray-400" />{u.email}</div>}
                    </div>
                  </td>
                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-semibold
                      ${u.user_type === "admin" || u.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-50 text-blue-700"}`}>
                      {u.user_type || u.role || "customer"}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {u.is_blocked
                        ? <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">Blocked</span>
                        : <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">Active</span>}
                      {!u.is_active && <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full w-fit">Inactive</span>}
                    </div>
                  </td>
                  {/* Joined */}
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.created_at)}</td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {acting === u.id
                        ? <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                        : (<>
                          {/* Block / Unblock */}
                          <button onClick={() => toggleBlock(u)}
                            title={u.is_blocked ? "Unblock" : "Block"}
                            className={`p-1.5 rounded-lg transition-colors
                              ${u.is_blocked
                                ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}>
                            {u.is_blocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                          {/* Activate / Deactivate */}
                          <button onClick={() => toggleActive(u)}
                            title={u.is_active ? "Deactivate" : "Activate"}
                            className={`p-1.5 rounded-lg transition-colors
                              ${u.is_active
                                ? "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                                : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                            {u.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          {/* Delete */}
                          <button onClick={() => handleDelete(u.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>)}
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
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1 text-gray-500">Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "overview",  label: "Overview",  icon: LayoutDashboard },
  { id: "products",  label: "Products",  icon: Package },
  { id: "orders",    label: "Orders",    icon: ShoppingCart },
  { id: "users",     label: "Users",     icon: Users },
];

export default function AdminDashboard() {
  const { ready, admin } = useAdminGuard();
  const router = useRouter();
  const [tab, setTab] = useState("overview");

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
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-green-600 text-white font-bold text-lg rounded-lg w-9 h-9 flex items-center justify-center">MK</div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg text-gray-900 leading-tight">MK Reddy</span>
              <span className="text-[10px] text-gray-500 -mt-0.5 font-medium uppercase tracking-wide">Admin Panel</span>
            </div>
          </Link>

          {/* Tabs — center */}
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${tab === id ? "bg-green-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden md:flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <Store className="w-4 h-4" /> View Store
            </Link>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{admin?.name || "Admin"}</p>
              <p className="text-xs text-gray-400">{admin?.phone || ""}</p>
            </div>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your store — products, orders and more</p>
        </div>

        {tab === "overview"  && <OverviewTab />}
        {tab === "products"  && <ProductsTab />}
        {tab === "orders"    && <OrdersTab />}
        {tab === "users"     && <UsersTab />}
      </main>
    </div>
  );
}

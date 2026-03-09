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
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ArchiveBoxIcon as Inventory,
  ChartPieIcon as Analytics,
  Bars3Icon as MenuIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
const Loader2 = ArrowPathIcon;
const RefreshCcw = ArrowPathIcon;
import ImageWithFallback from "@/components/common/ImageWithFallback";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";
import RevenueChart from "@/components/admin/RevenueChart";
import RecentOrders from "@/components/admin/RecentOrders";
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
// Returns context-aware unit chips for the ProductModal based on category name
function getUnitOptions(categoryName = "") {
  const n = categoryName.toLowerCase();
  if (/bulk|loose/.test(n))
    return ["250 g", "500 g", "1 kg", "2 kg", "5 kg", "10 kg", "25 kg", "50 kg"];
  if (/rice|cereal|wheat|sooji/.test(n))
    return ["250 g", "500 g", "1 kg", "2 kg", "5 kg", "10 kg", "25 kg"];
  if (/atta|flour|maida/.test(n))
    return ["500 g", "1 kg", "2 kg", "5 kg", "10 kg", "25 kg"];
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

  if (error && !stats)
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <button onClick={() => load()} className="mt-3 text-sm text-indigo-600 hover:underline">Try again</button>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* -- KPI Stats Cards -- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <button onClick={() => handleCardClick("products")} className="bg-white rounded-[14px] border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow text-left relative overflow-hidden group">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <Package className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-[13px] font-medium text-gray-500">Total Products</p>
          <p className="text-[28px] font-bold text-gray-900 mt-1 tracking-tight">{loading ? "-" : (stats?.products?.total ?? 0)}</p>
          <p className="text-[12px] text-gray-400 mt-1">{stats?.products?.active ?? 0} active</p>
        </button>

        <button onClick={() => handleCardClick("orders")} className="bg-white rounded-[14px] border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow text-left relative overflow-hidden group">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-[13px] font-medium text-gray-500">Orders Today</p>
          <p className="text-[28px] font-bold text-gray-900 mt-1 tracking-tight">{loading ? "-" : (stats?.today?.orders ?? 0)}</p>
          <p className="text-[12px] text-gray-400 mt-1">{stats?.orders?.pending ?? 0} pending</p>
        </button>

        <div className="bg-white rounded-[14px] border border-gray-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <CircleDollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-[13px] font-medium text-gray-500">Revenue Today</p>
          <p className="text-[28px] font-bold text-gray-900 mt-1 tracking-tight">{loading ? "-" : fmtCurrency(stats?.today?.revenue)}</p>
          <p className="text-[12px] text-gray-400 mt-1">All time: {fmtCurrency(stats?.revenue?.allTime)}</p>
        </div>

        <button onClick={() => handleCardClick("customers")} className="bg-white rounded-[14px] border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow text-left relative overflow-hidden group">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
            <Users className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-[13px] font-medium text-gray-500">Customers</p>
          <p className="text-[28px] font-bold text-gray-900 mt-1 tracking-tight">{loading ? "-" : (stats?.customers?.total ?? 0)}</p>
          <p className="text-[12px] text-gray-400 mt-1">{stats?.customers?.newToday ?? 0} new today</p>
        </button>
      </div>

      {/* -- Sales Analytics -- */}
      <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900">Revenue Overview</h2>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {refreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
            {refreshing ? "Updating..." : "Auto-refreshes every 30s"}
            <button onClick={handleRefresh} disabled={refreshing} className="ml-2 p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
              <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="p-6">
          <RevenueChart />
        </div>
        {/* Metrics under chart */}
        {!loading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-gray-100">
            <div className="px-6 py-4 border-r border-gray-100">
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Orders</p>
              <p className="text-[18px] font-bold text-gray-900 mt-0.5">{stats?.today?.orders ?? 0}</p>
            </div>
            <div className="px-6 py-4 border-r border-gray-100">
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-[18px] font-bold text-emerald-600 mt-0.5">{stats?.orders?.completed ?? 0}</p>
            </div>
            <div className="px-6 py-4 border-r border-gray-100">
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Cancelled</p>
              <p className="text-[18px] font-bold text-red-500 mt-0.5">{stats?.orders?.cancelled ?? 0}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Revenue</p>
              <p className="text-[18px] font-bold text-gray-900 mt-0.5">{fmtCurrency(stats?.today?.revenue)}</p>
            </div>
          </div>
        )}
      </div>

      {/* -- Operational Panels (Two Columns) -- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-gray-900">Recent Orders</h2>
            <button onClick={() => onSwitchTab?.("orders")} className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <RecentOrders orders={orders} loading={loading} onStatusUpdate={handleStatusUpdate} onViewAll={() => onSwitchTab?.("orders")} />
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-gray-900">Top Selling Products</h2>
            <button onClick={() => onSwitchTab?.("products")} className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
          </div>
          <div className="p-4">
            <TopProducts />
          </div>
        </div>
      </div>

      {/* -- Activity + Insights Row -- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-4">
            <RecentActivity initialActivity={stats?.recentActivity} statsLoading={loading} />
          </div>
        </div>

        {/* Insights Panel */}
        <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-[16px] font-bold text-gray-900">Insights</h2>
          </div>
          <div className="p-5 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : (
              <>
                {(stats?.products?.lowStock ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-amber-800">{stats.products.lowStock} product{stats.products.lowStock !== 1 ? "s" : ""} low stock</p>
                      <p className="text-[12px] text-amber-600 mt-0.5">Review inventory to avoid stockouts</p>
                    </div>
                  </div>
                )}
                {(stats?.today?.revenue ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-emerald-800">Revenue: {fmtCurrency(stats.today.revenue)} today</p>
                      <p className="text-[12px] text-emerald-600 mt-0.5">From {stats.today.orders} order{stats.today.orders !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
                {(stats?.orders?.pending ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-blue-800">{stats.orders.pending} pending order{stats.orders.pending !== 1 ? "s" : ""}</p>
                      <p className="text-[12px] text-blue-600 mt-0.5">Needs attention</p>
                    </div>
                  </div>
                )}
                {(stats?.customers?.newToday ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                    <UserCheck className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-violet-800">{stats.customers.newToday} new customer{stats.customers.newToday !== 1 ? "s" : ""} today</p>
                      <p className="text-[12px] text-violet-600 mt-0.5">Customer base growing</p>
                    </div>
                  </div>
                )}
                {(stats?.products?.lowStock ?? 0) === 0 && (stats?.today?.revenue ?? 0) === 0 && (stats?.orders?.pending ?? 0) === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <Check className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-gray-500">All clear! No alerts right now.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* -- Product Performance + Customer Insights -- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900">Product Performance</h2>
          </div>
          <div className="p-4">
            <FrequentlyBoughtProducts />
          </div>
        </div>
        <div className="bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900">Customer Insights</h2>
          </div>
          <div className="p-4">
            <UserWiseSales />
          </div>
        </div>
      </div>
    </div>
  );
}
function ProductModal({ product, categories, allProducts = [], onClose, onSaved, onAddVariant }) {
  const isEdit = !!product;

  function getParentCatId() {
    if (!product?.category_id) return "";
    const cat = categories.find((c) => c.id === product.category_id);
    return cat?.parent_id || "";
  }
  function getFirstImage() {
    if (Array.isArray(product?.image_urls) && product.image_urls.length) return product.image_urls[0] || "";
    return product?.image_url || "";
  }
  function getAllImages() {
    if (Array.isArray(product?.image_urls) && product.image_urls.length) return product.image_urls;
    if (product?.image_url) return [product.image_url];
    return [];
  }
  function parseUnitToGrams(unitStr) {
    if (!unitStr) return null;
    const lower = unitStr.toLowerCase().trim();
    const m = lower.match(/^([\d.]+)\s*(kg|g|gm|gram|grams|kilo|kilogram|kilograms|ml|l|liter|litre)$/);
    if (!m) return null;
    const val = parseFloat(m[1]);
    const u = m[2];
    if (["kg","kilo","kilogram","kilograms"].includes(u)) return val * 1000;
    if (["l","liter","litre"].includes(u)) return val * 1000;
    return val;
  }
  function calcVariantPrice(sizeStr, basePrice) {
    const baseGrams = 1000;
    const g = parseUnitToGrams(sizeStr);
    if (!g || !basePrice) return "";
    return Math.round((parseFloat(basePrice) * g) / baseGrams);
  }
  function generateSKU(name, size) {
    const n = (name || "").replace(/[^a-z0-9 ]/gi,"").trim().toUpperCase().replace(/\s+/g,"-").slice(0,15);
    const s = (size || "").toUpperCase().replace(/\s+/g,"");
    return `${n}-${s}`.replace(/-+/g,"-").replace(/-$/,"");
  }

  const [parentCatId, setParentCatId] = useState(getParentCatId());
  const [form, setForm] = useState({
    name: product?.name || "",
    brand: product?.brand || "",
    sku: product?.sku || "",
    description: product?.description || "",
    category_id: product?.category_id || "",
    is_active: product?.is_active !== false,
    is_featured: product?.is_featured || false,
    price: product?.price || "",
    mrp: product?.mrp || "",
    stock: product?.stock_quantity ?? "",
    low_stock_threshold: product?.low_stock_threshold ?? 10,
    unit: product?.variant || product?.unit || "",
    unit_type: product?.unit_type || null,
  });
  const [imageUrls, setImageUrls] = useState(getAllImages);
  const [newImageInput, setNewImageInput] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Multi-variant creation (create mode)
  const [activeTab, setActiveTab] = useState("sizes");
  const [basePricePerKg, setBasePricePerKg] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [variantRows, setVariantRows] = useState([]);
  const [customSize, setCustomSize] = useState("");
  const [activePreset, setActivePreset] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const parentCats = categories.filter((c) => !c.parent_id);
  const subCats = categories.filter((c) => c.parent_id === parentCatId);
  const activeCatName = useMemo(() => {
    return categories.find((c) => c.id === form.category_id)?.name
      || categories.find((c) => c.id === parentCatId)?.name
      || "";
  }, [form.category_id, parentCatId, categories]);

  const categoryChips = useMemo(() => getUnitOptions(activeCatName), [activeCatName]);

  const existingVariants = useMemo(() => {
    if (!product?.id) return [];
    return allProducts.filter((p) => p.parent_product_id === product.id);
  }, [product, allProducts]);

  const PRESETS = {
    "Grocery": ["100 g", "250 g", "500 g", "1 kg", "2 kg"],
    "Spice": ["50 g", "100 g", "200 g", "500 g"],
    "Liquid": ["200 ml", "500 ml", "1 L", "2 L"],
    "Bulk": ["1 kg", "2 kg", "5 kg", "10 kg", "25 kg"],
  };

  function syncVariantRows(sizes, base) {
    const bp = base !== undefined ? base : basePricePerKg;
    setVariantRows(curr =>
      sizes.map(s => {
        const existing = curr.find(r => r.size === s);
        if (existing) return existing;
        const p = calcVariantPrice(s, bp);
        return { size: s, price: p ? String(p) : "", mrp: p ? String(p) : "", stock: "10", low_stock_threshold: 10 };
      })
    );
  }

  function toggleSize(size) {
    setSelectedSizes(prev => {
      const next = prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size];
      syncVariantRows(next);
      return next;
    });
  }

  function updateRow(size, field, value) {
    setVariantRows(prev => prev.map(r => r.size === size ? { ...r, [field]: value } : r));
  }

  useEffect(() => {
    if (!basePricePerKg) return;
    setVariantRows(prev =>
      prev.map(r => {
        const p = calcVariantPrice(r.size, basePricePerKg);
        return p ? { ...r, price: String(p), mrp: String(p) } : r;
      })
    );
  }, [basePricePerKg]);

  const discountPct = (() => {
    const m = parseFloat(form.mrp) || 0;
    const p = parseFloat(form.price) || 0;
    return m > p && m > 0 ? Math.round(((m - p) / m) * 100) : 0;
  })();

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required"); return; }
    if (!form.category_id) { setError("Please select a subcategory"); return; }
    setSaving(true);
    setError("");
    try {
      const imgs = imageUrls.filter(Boolean);
      if (isEdit) {
        if (!form.price || !form.mrp) { setError("Price and MRP are required"); setSaving(false); return; }
        const res = await api.put(`/products/${product.id}`, {
          name_en: form.name.trim(),
          brand: form.brand || undefined,
          sku: form.sku || undefined,
          mrp: form.mrp !== "" ? parseFloat(form.mrp) : undefined,
          price: form.price !== "" ? parseFloat(form.price) : undefined,
          stock_quantity: form.stock !== "" && form.stock !== null && form.stock !== undefined ? parseFloat(form.stock) : undefined,
          low_stock_threshold: form.low_stock_threshold,
          unit: form.unit || undefined,
          variant: form.unit || undefined,
          unit_type: form.unit_type || undefined,
          category_id: form.category_id,
          description_en: form.description || undefined,
          is_active: form.is_active,
          is_featured: form.is_featured,
          image_url: imgs[0] || null,
          image_urls: imgs,
        });
        onSaved(res.data || res);
      } else if (activeTab === "sizes" && variantRows.length > 0) {
        let parentId = null;
        for (let i = 0; i < variantRows.length; i++) {
          const row = variantRows[i];
          if (!row.price) continue;
          const res = await api.post("/products", {
            name_en: form.name.trim(),
            brand: form.brand || undefined,
            sku: generateSKU(form.name, row.size) || undefined,
            mrp: row.mrp ? parseFloat(row.mrp) : (row.price ? parseFloat(row.price) : undefined),
            price: row.price ? parseFloat(row.price) : undefined,
            stock_quantity: parseFloat(row.stock) || 0,
            low_stock_threshold: row.low_stock_threshold ?? form.low_stock_threshold,
            unit: row.size,
            variant: row.size,
            category_id: form.category_id,
            description_en: form.description || undefined,
            is_active: form.is_active,
            is_featured: i === 0 ? form.is_featured : false,
            parent_product_id: i === 0 ? null : parentId,
            image_url: imgs[0] || null,
            image_urls: imgs,
          });
          if (i === 0) parentId = res.data?.id || res.data?.product?.id;
        }
        onSaved();
      } else {
        if (!form.price || !form.mrp) { setError("Price and MRP are required (or select pack sizes above)"); setSaving(false); return; }
        await api.post("/products", {
          name_en: form.name.trim(),
          brand: form.brand || undefined,
          sku: form.sku || undefined,
          mrp: form.mrp !== "" ? parseFloat(form.mrp) : undefined,
          price: form.price !== "" ? parseFloat(form.price) : undefined,
          stock_quantity: form.stock !== "" && form.stock !== null && form.stock !== undefined ? parseFloat(form.stock) : undefined,
          low_stock_threshold: form.low_stock_threshold,
          unit: form.unit || undefined,
          variant: form.unit || undefined,
          category_id: form.category_id,
          description_en: form.description || undefined,
          is_active: form.is_active,
          is_featured: form.is_featured,
          image_url: imgs[0] || null,
          image_urls: imgs,
        });
        onSaved();
      }
    } catch (err) {
      const msg = err.message || "Save failed";
      setError(msg.includes("SKU") ? `SKU conflict: ${msg}` : msg);
    } finally {
      setSaving(false);
    }
  }

  const sizeChips = categoryChips.length > 0 ? categoryChips : ["100 g", "250 g", "500 g", "1 kg", "2 kg", "5 kg"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? "bg-indigo-100" : "bg-green-100"}`}>
              <Package className={`w-5 h-5 ${isEdit ? "text-indigo-600" : "text-green-600"}`} />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">{isEdit ? "Edit Product" : "Add New Product"}</h2>
              {isEdit && <p className="text-[11px] text-gray-400">{product.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={save} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row min-h-0">

              {/* ── LEFT COLUMN (main fields) ── */}
              <div className="flex-1 px-6 py-5 space-y-5">
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Product Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Kandi Pappu, Basmati Rice..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                  />
                </div>

                {/* Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                    <select
                      value={parentCatId}
                      onChange={(e) => { setParentCatId(e.target.value); set("category_id", ""); }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">Select category</option>
                      {parentCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Subcategory *</label>
                    <select
                      value={form.category_id}
                      onChange={(e) => set("category_id", e.target.value)}
                      disabled={!parentCatId}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 bg-white"
                    >
                      <option value="">Select subcategory</option>
                      {subCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="e.g. Fortune, Parle, Local..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* ── CREATE MODE: Tab toggle ── */}
                {!isEdit && (
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab("sizes")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "sizes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Pack Sizes (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("single")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Single Product
                    </button>
                  </div>
                )}

                {/* ── PACK SIZES MODE ── */}
                {(!isEdit && activeTab === "sizes") && (
                  <div className="space-y-4">
                    {/* Base Price */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Base Price (per kg / per liter)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">₹</span>
                        <input
                          type="number"
                          value={basePricePerKg}
                          onChange={(e) => setBasePricePerKg(e.target.value)}
                          placeholder="e.g. 150 — variant prices are auto-calculated"
                          className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      {basePricePerKg && !isNaN(parseFloat(basePricePerKg)) && (
                        <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                          Auto-calc: 250g = ₹{Math.round(parseFloat(basePricePerKg) * 0.25)}, 500g = ₹{Math.round(parseFloat(basePricePerKg) * 0.5)}, 1kg = ₹{Math.round(parseFloat(basePricePerKg))}
                        </p>
                      )}
                    </div>

                    {/* Size Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Pack Sizes</label>
                        <div className="flex gap-1.5">
                          {Object.keys(PRESETS).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                const sizes = PRESETS[preset];
                                setActivePreset(preset);
                                setSelectedSizes(sizes);
                                syncVariantRows(sizes);
                              }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                activePreset === preset
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(sizeChips)].map((chip) => (
                          <button
                            type="button"
                            key={chip}
                            onClick={() => { setActivePreset(null); toggleSize(chip); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                              selectedSizes.includes(chip)
                                ? "bg-green-600 text-white border-green-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700"
                            }`}
                          >
                            {selectedSizes.includes(chip) && "✓ "}{chip}
                          </button>
                        ))}
                        <div className="flex items-center gap-1.5">
                          <input
                            value={customSize}
                            onChange={(e) => setCustomSize(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (customSize.trim()) { toggleSize(customSize.trim()); setCustomSize(""); } } }}
                            placeholder="Custom..."
                            className="border border-gray-300 rounded-full px-3 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          {customSize.trim() && (
                            <button
                              type="button"
                              onClick={() => { toggleSize(customSize.trim()); setCustomSize(""); }}
                              className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full hover:bg-green-200"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Variant Table */}
                    {variantRows.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Variants</label>
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] text-gray-400">{variantRows.length} variant{variantRows.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Size</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Selling Price (₹)</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">MRP (₹)</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Stock</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-bold text-orange-400 uppercase tracking-wide">Alert</th>
                                <th className="px-3 py-2.5 w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {variantRows.map((row, i) => (
                                <tr key={row.size} className="hover:bg-gray-50/80 transition-colors">
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-gray-800 text-xs bg-gray-100 px-2 py-0.5 rounded-lg">{row.size}</span>
                                      {i === 0 && <span className="text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Parent</span>}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="relative w-24">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={row.price}
                                        onChange={(e) => updateRow(row.size, "price", e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-green-500"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="relative w-24">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={row.mrp}
                                        onChange={(e) => updateRow(row.size, "mrp", e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <input
                                      type="number"
                                      value={row.stock}
                                      onChange={(e) => updateRow(row.size, "stock", e.target.value)}
                                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.low_stock_threshold ?? 10}
                                      onChange={(e) => updateRow(row.size, "low_stock_threshold", parseInt(e.target.value, 10) || 0)}
                                      className="w-16 border border-orange-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                                    />
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <button type="button" onClick={() => toggleSize(row.size)} className="text-gray-300 hover:text-red-500 transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">First row becomes the parent product. Others link as size variants automatically.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SINGLE PRODUCT MODE ── */}
                {(!isEdit && activeTab === "single") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Unit / Pack Size</label>
                      <input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. 1 kg, 500 ml, pcs..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">SKU (optional)</label>
                      <input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Auto-generated if blank" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selling Price (₹) *</label>
                        {discountPct > 0 && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{discountPct}% OFF</span>}
                      </div>
                      <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">MRP (₹) *</label>
                      <input type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stock Quantity</label>
                      <input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                )}

                {/* ── EDIT MODE ── */}
                {isEdit && (
                  <>
                    {/* Unit / Pack Size + SKU */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Unit / Pack Size</label>
                        <input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. 1 kg, 500 ml..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">SKU</label>
                        <input value={form.sku} onChange={(e) => set("sku", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <p className="text-[10px] text-amber-600 mt-1">Change carefully - must stay unique</p>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pricing</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">MRP (₹) *</label>
                            <input type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Selling Price (₹) *</label>
                            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Discount %</span>
                          <span className={`text-sm font-bold ${discountPct > 0 ? "text-green-600" : "text-gray-400"}`}>
                            {discountPct > 0 ? `${discountPct}% OFF` : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inventory */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Inventory</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stock Quantity</label>
                          <input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Low Stock Alert</label>
                          <input
                            type="number"
                            min="0"
                            value={form.low_stock_threshold}
                            onChange={(e) => set("low_stock_threshold", parseInt(e.target.value, 10) || 0)}
                            className="w-full border border-orange-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <p className="text-[10px] text-orange-500 mt-1">Warn when stock falls below this</p>
                        </div>
                      </div>
                    </div>

                    {/* Variants */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Variants</span>
                        <div className="flex-1 h-px bg-gray-100" />
                        {onAddVariant && (
                          <button
                            type="button"
                            onClick={() => { onClose(); onAddVariant(product); }}
                            className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                          >
                            <Plus className="w-3 h-3" /> Add New Size
                          </button>
                        )}
                      </div>
                      {existingVariants.length > 0 ? (
                        <>
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                  <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase">Size</th>
                                  <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase">Price</th>
                                  <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-400 uppercase">Stock</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {existingVariants.map((v) => (
                                  <tr key={v.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{v.variant || v.unit || "Variant"}</span>
                                    </td>
                                    <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{v.price}</td>
                                    <td className="px-3 py-2 text-sm text-gray-600">{v.stock_quantity ?? 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">Click a variant row in the products list to edit it individually.</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 py-2">No variants linked yet. Use Add New Size to create variants.</p>
                      )}
                    </div>
                  </>
                )}

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                  <textarea
                    rows={1}
                    value={form.description}
                    onChange={(e) => {
                      set("description", e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onFocus={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    placeholder="Optional product description..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden"
                    style={{ minHeight: "2.75rem" }}
                  />
                </div>
              </div>

              {/* ── RIGHT COLUMN (quick settings) ── */}
              <div className="w-[30%] min-w-[260px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 px-5 py-5 bg-gray-50/40 space-y-4">

                {/* Product Images */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Product Images</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    {imageUrls.length > 0 && (
                      <span className="text-[10px] text-gray-400">{activeImageIdx + 1}/{imageUrls.length}</span>
                    )}
                  </div>

                  {/* Big preview */}
                  {imageUrls.length > 0 ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-2">
                      <img
                        src={imageUrls[activeImageIdx] || imageUrls[0]}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrls((prev) => {
                            const next = prev.filter((_, i) => i !== activeImageIdx);
                            setActiveImageIdx(Math.max(0, activeImageIdx - 1));
                            return next;
                          });
                        }}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 shadow hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove this image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {activeImageIdx === 0 && (
                        <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">Main</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-white mb-2">
                      <Package className="w-10 h-10 text-gray-200 mb-1" />
                      <p className="text-xs text-gray-400">No images yet</p>
                    </div>
                  )}
                  {/* URL of active image */}
                  {imageUrls.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-white border border-gray-200 rounded-xl">
                      <span className="flex-1 text-[10px] text-gray-400 truncate font-mono">{imageUrls[activeImageIdx] || imageUrls[0]}</span>
                      <a
                        href={imageUrls[activeImageIdx] || imageUrls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
                      >Open</a>
                    </div>
                  )}

                  {/* Thumbnail strip */}
                  {imageUrls.length > 1 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {imageUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`w-12 h-12 rounded-lg border-2 overflow-hidden bg-gray-50 shrink-0 transition-all ${
                            idx === activeImageIdx ? "border-green-500 shadow-sm" : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add new image URL */}
                  <div className="flex gap-1.5">
                    <input
                      value={newImageInput}
                      onChange={(e) => setNewImageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const url = newImageInput.trim();
                          if (url) { setImageUrls((prev) => [...prev, url]); setNewImageInput(""); }
                        }
                      }}
                      placeholder="Paste image URL..."
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = newImageInput.trim();
                        if (url) { setImageUrls((prev) => [...prev, url]); setNewImageInput(""); }
                      }}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">First image is the main thumbnail. Press Enter or Add.</p>
                </div>

                {/* Product Settings */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Product Settings</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Status */}
                <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Status</p>
                    <p className="text-[11px] text-gray-400">{form.is_active ? "Active — visible in store" : "Inactive — hidden"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("is_active", !form.is_active)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.is_active ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${form.is_active ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                {/* Featured toggle */}
                <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <StarIcon className="w-3.5 h-3.5 text-yellow-500" /> Featured
                    </p>
                    <p className="text-[11px] text-gray-400">Show on homepage</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("is_featured", !form.is_featured)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.is_featured ? "bg-yellow-400" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${form.is_featured ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                {/* Loose / Regular toggle (edit mode only) */}
                {isEdit && (
                  <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-200">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-orange-500" /> Loose / Bulk
                      </p>
                      <p className="text-[11px] text-gray-400">{form.unit_type === "loose" ? "Sold by weight" : "Pre-packed product"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => set("unit_type", form.unit_type === "loose" ? null : "loose")}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.unit_type === "loose" ? "bg-orange-400" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${form.unit_type === "loose" ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                )}

                {/* Auto SKU preview */}
                {form.name && (
                  <div className="py-3 px-4 bg-white rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Auto SKU Preview</p>
                    <p className="text-xs font-mono text-indigo-600 break-all">
                      {generateSKU(form.name, selectedSizes[0] || form.unit || "1KG")}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Generated per variant on save</p>
                  </div>
                )}

                {/* Variant count summary */}
                {!isEdit && activeTab === "sizes" && selectedSizes.length > 0 && (
                  <div className="py-3 px-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-xs font-bold text-green-800">{variantRows.length} product{variantRows.length !== 1 ? "s" : ""} will be created</p>
                    <p className="text-[10px] text-green-600 mt-0.5">{selectedSizes.join(", ")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit
                ? "Save Changes"
                : activeTab === "sizes" && variantRows.length > 0
                  ? `Create ${variantRows.length} Product${variantRows.length !== 1 ? "s" : ""}`
                  : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
/* ── Variant sub-row (indented, lighter) ── */
function VariantSubRow({ p, onEdit, onDelete, onAdjustStock, deleting, selected, onSelect }) {
  const mrp = parseFloat(p.mrp || 0);
  const price = parseFloat(p.price || 0);
  const disc = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const img = Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_url;
  const stock = p.stock_quantity ?? 0;
  return (
    <tr className="bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors border-l-4 border-indigo-200" style={{ height: 72 }}>
      <td className="pl-4 pr-2 py-3 w-10">
        <input type="checkbox" checked={!!selected} onChange={() => onSelect(p.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
      </td>
      <td className="pl-8 pr-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
            <ImageWithFallback src={img} alt={p.name} size="sm" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-700 leading-tight truncate">{p.variant || p.unit_pack_size || p.unit || "Variant"}</p>
            {p.sku && <p className="text-[11px] text-gray-400 mt-0.5">SKU: {p.sku}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-bold text-gray-900 text-[13px]">₹{price}</span>
        {mrp > price && <span className="ml-1.5 text-xs text-gray-400 line-through">₹{mrp}</span>}
        {disc > 0 && <p className="text-[11px] text-green-600 font-medium mt-0.5">{disc}% off</p>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-semibold ${stock <= 0 ? "text-red-500" : stock <= 10 ? "text-orange-500" : "text-gray-800"}`}>{stock}</span>
          {stock <= 0 ? (
            <span className="inline-flex items-center bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Out</span>
          ) : stock <= 10 ? (
            <span className="inline-flex items-center bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Low</span>
          ) : (
            <span className="inline-flex items-center bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">OK</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3">
        {p.is_active === false ? (
          <span className="inline-flex items-center bg-gray-100 text-gray-500 text-[11px] font-semibold px-2.5 py-1 rounded-full">Inactive</span>
        ) : stock <= 0 ? (
          <span className="inline-flex items-center bg-red-100 text-red-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">Out of Stock</span>
        ) : stock <= 10 ? (
          <span className="inline-flex items-center bg-orange-100 text-orange-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">Low Stock</span>
        ) : (
          <span className="inline-flex items-center bg-green-100 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">Active</span>
        )}
      </td>
      <td className="px-4 py-3 text-[12px] text-gray-400">-</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(p)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onAdjustStock(p)} title="Adjust stock" className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"><Package className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(p.id)} disabled={deleting === p.id} title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
    stock_quantity: 0,
    low_stock_threshold: 10,
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
        mrp: form.mrp ? parseFloat(form.mrp) : undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        stock_quantity: parent.unit_type === "loose" ? 0 : (parseFloat(form.stock_quantity) || 0),
        low_stock_threshold: form.low_stock_threshold,
        variant: form.unit,
        unit: form.unit,
        unit_type: parent.unit_type || null,
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
          {parent.unit_type !== "loose" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Stock Quantity</label>
                <input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Low Stock Alert</label>
                <input type="number" min="0" value={form.low_stock_threshold} onChange={e => set("low_stock_threshold", parseInt(e.target.value, 10) || 0)} className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-orange-700">Shared Stock Pool</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Stock is managed on the parent product in kg. This variant draws from that shared pool.</p>
            </div>
          )}
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

/* ── Stock Adjust Modal ── */
function StockAdjustModal({ product, onClose, onSaved }) {
  const [qty, setQty] = useState("");
  const [mode, setMode] = useState("set"); // set | add | subtract
  const [saving, setSaving] = useState(false);
  const currentStock = product.stock_quantity ?? 0;

  const previewStock = (() => {
    const n = parseInt(qty, 10);
    if (isNaN(n)) return currentStock;
    if (mode === "set") return n;
    if (mode === "add") return currentStock + n;
    return Math.max(0, currentStock - n);
  })();

  async function save(e) {
    e.preventDefault();
    const n = parseInt(qty, 10);
    if (isNaN(n)) return;
    setSaving(true);
    try {
      let res;
      if (mode === "set") {
        res = await api.put(`/products/${product.id}/stock`, { quantity: n, operation: "set" });
      } else if (mode === "add") {
        res = await api.put(`/products/${product.id}/stock`, { quantity: n, operation: "add" });
      } else {
        res = await api.put(`/products/${product.id}/stock`, { quantity: n, operation: "subtract" });
      }
      onSaved(res.data || { ...product, stock_quantity: previewStock });
    } catch (err) {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-sm text-gray-900">Adjust Stock</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{product.name} {product.variant ? `(${product.variant})` : ""}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4">
          <div className="flex items-center justify-center gap-4 text-center">
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Current</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{currentStock}</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-300" />
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">New</p>
              <p className={`text-2xl font-bold mt-1 ${previewStock <= 0 ? "text-red-500" : previewStock <= 10 ? "text-orange-500" : "text-green-600"}`}>{previewStock}</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[["set", "Set"], ["add", "Add"], ["subtract", "Remove"]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setMode(id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {label}
              </button>
            ))}
          </div>
          <div>
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={mode === "set" ? "New stock quantity" : "Quantity"} autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || qty === ""} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Update Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Image Zoom Preview ── */
function ImageZoomPreview({ src, alt, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl p-2 max-w-md max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-2 -right-2 bg-white border border-gray-200 shadow-md rounded-full p-1 text-gray-500 hover:text-gray-700 z-10">
          <X className="w-4 h-4" />
        </button>
        <img src={src} alt={alt} className="max-w-full max-h-[75vh] object-contain rounded-xl" referrerPolicy="no-referrer" />
        <p className="text-center text-xs text-gray-500 mt-2 truncate">{alt}</p>
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
  onAdjustStock,
  onDuplicate,
  selected,
  onSelect,
  onImageZoom,
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  const mrp = parseFloat(p.mrp || 0);
  const price = parseFloat(p.price || 0);
  const disc = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const img = Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_url;
  const hasVariants = variants && variants.length > 0;
  const stock = p.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= (p.low_stock_threshold ?? 10);
  const isInactive = p.is_active === false;
  const catName = p.category_name || p.parent_category_name || "";

  function statusPill() {
    if (isInactive) return <span className="inline-flex items-center bg-gray-100 text-gray-500 text-[11px] font-semibold px-2.5 py-1 rounded-full">Inactive</span>;
    if (isOutOfStock) return <span className="inline-flex items-center bg-red-100 text-red-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">Out of Stock</span>;
    if (isLowStock) return <span className="inline-flex items-center bg-orange-100 text-orange-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">Low Stock</span>;
    return <span className="inline-flex items-center bg-green-100 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">Active</span>;
  }

  return (
    <>
      <tr
        className={`hover:bg-gray-50/80 transition-colors group ${isInactive ? "opacity-60" : ""}`}
        style={{ height: 72 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Checkbox */}
        <td className="pl-4 pr-2 py-3 w-10">
          <input type="checkbox" checked={!!selected} onChange={() => onSelect(p.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
        </td>
        {/* Product */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-[10px] bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all"
              onClick={() => img && onImageZoom(img, p.name)}
            >
              <ImageWithFallback src={img} alt={p.name} size="sm" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-gray-900 text-[14px] leading-tight line-clamp-1">{p.name}</p>
                {p.is_featured && <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />}
                {p.unit_type === "loose" && <span className="bg-orange-100 text-orange-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">Loose</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-gray-400 leading-tight">
                {p.sku && <span>SKU: {p.sku}</span>}
                {p.sku && p.brand && <span>-</span>}
                {p.brand && <span className="text-gray-500">{p.brand}</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {(p.variant || p.unit_pack_size) && <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{p.variant || p.unit_pack_size}</span>}
                {hasVariants && (
                  <button onClick={() => setExpanded(!expanded)} className="text-[11px] text-blue-500 font-medium hover:text-blue-700">
                    +{variants.length} sizes {expanded ? "▾" : "▸"}
                  </button>
                )}
              </div>

            </div>
          </div>
        </td>
        {/* Price */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div>
            <span className="font-bold text-gray-900 text-[14px]">₹{price}</span>
            {mrp > price && <span className="ml-1.5 text-xs text-gray-400 line-through">₹{mrp}</span>}
          </div>
          {disc > 0 && <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">{disc}% off</span>}
        </td>
        {/* Stock */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className={`text-[14px] font-semibold ${isOutOfStock ? "text-red-500" : isLowStock ? "text-orange-500" : "text-gray-800"}`}>
              {p.unit_type === "loose" ? `${stock} kg` : stock}
            </span>
            {isOutOfStock ? (
              <span className="inline-flex items-center bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Out</span>
            ) : isLowStock ? (
              <span className="inline-flex items-center bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Low</span>
            ) : (
              <span className="inline-flex items-center bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">OK</span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">{p.unit_type === "loose" ? "loose" : p.unit_pack_size ? `per ${p.unit_pack_size}` : "units"}</p>
        </td>
        {/* Category */}
        <td className="px-4 py-3 whitespace-nowrap">
          {catName && <span className="text-[12px] text-gray-600 bg-gray-100 px-2 py-1 rounded-lg font-medium">{catName}</span>}
        </td>
        {/* Status */}
        <td className="px-4 py-3">{statusPill()}</td>
        {/* Sales */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-[13px] text-gray-600 font-medium">{p.total_sold ?? "-"}</span>
          {p.total_sold > 0 && <p className="text-[11px] text-gray-400">sold</p>}
        </td>
        {/* Actions */}
        <td className="px-4 py-3">
          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => {
                if (!menuOpen) {
                  const rect = btnRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                }
                setMenuOpen((o) => !o);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
                className="z-[200] w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 text-[13px]"
              >
                <button onClick={() => { onEdit(p); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left">
                  <Pencil className="w-4 h-4 text-gray-400" /> Edit
                </button>
                <button onClick={() => { onDuplicate(p); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left">
                  <DocumentTextIcon className="w-4 h-4 text-gray-400" /> Duplicate
                </button>
                <button onClick={() => { onAdjustStock(p); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left">
                  <Package className="w-4 h-4 text-gray-400" /> Adjust Stock
                </button>
                <button onClick={() => { window.open(`/products/${p.id}`, "_blank"); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left">
                  <Eye className="w-4 h-4 text-gray-400" /> View Product
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { onToggleFeatured(p); setMenuOpen(false); }} disabled={togglingFeatured === p.id}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left disabled:opacity-50">
                  {togglingFeatured === p.id ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <StarIcon className={`w-4 h-4 ${p.is_featured ? "text-yellow-400 fill-yellow-400" : "text-gray-400"}`} />}
                  {p.is_featured ? "Remove Featured" : "Mark Featured"}
                </button>
                <button onClick={() => { onAddVariant(p); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left">
                  <Plus className="w-4 h-4 text-gray-400" /> Add Variant
                </button>
                <button onClick={() => { onToggleActive(p); setMenuOpen(false); }} disabled={togglingActive === p.id}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 text-left disabled:opacity-50">
                  {togglingActive === p.id ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : isInactive ? <Eye className="w-4 h-4 text-gray-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  {isInactive ? "Activate" : "Deactivate"}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { onDelete(p.id); setMenuOpen(false); }} disabled={deleting === p.id}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 text-red-600 text-left disabled:opacity-50">
                  {deleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
      {hasVariants && expanded && variants.map((v) => (
        <VariantSubRow key={v.id} p={v} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} deleting={deleting} selected={selected} onSelect={onSelect} />
      ))}
    </>
  );
}
function ProductsTab() {
  const { confirm, toast } = useDialog();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [togglingFeatured, setTogglingFeatured] = useState(null);
  const [togglingActive, setTogglingActive] = useState(null);
  const [openCategories, setOpenCategories] = useState(new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [filterCat, setFilterCat] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const searchTimer = useRef(null);
  const uploadRef = useRef(null);
  const tableTopRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

  async function authFetch(endpoint, options = {}) {
    const token = secureStorage.getItem("token");
    const headers = { ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const lang = typeof window !== "undefined" ? localStorage.getItem("language") || "en" : "en";
    headers["Accept-Language"] = lang;
    return fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  }

  async function handleDownloadExport(ids = null) {
    setDownloadingExport(true);
    try {
      const endpoint = ids && ids.length > 0
        ? `/products/admin/export?ids=${ids.join(",")}`
        : "/products/admin/export";
      const res = await authFetch(endpoint);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = ids && ids.length > 0 ? `products-selected-${today}.xlsx` : `products-${today}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e.message || "Download failed", "error");
    } finally {
      setDownloadingExport(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await authFetch("/products/template/download");
      if (!res.ok) throw new Error(`Template download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e.message || "Download failed", "error");
    }
  }

  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadLoading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setUploadResult(null);

    // Simulate progress: ramp to 80% quickly, hold there until server responds
    let prog = 0;
    const progInterval = setInterval(() => {
      prog = prog < 80 ? prog + Math.random() * 12 : prog + Math.random() * 1.5;
      setUploadProgress(Math.min(prog, 92));
    }, 300);

    try {
      const token = secureStorage.getItem("token");
      const lang = typeof window !== "undefined" ? localStorage.getItem("language") || "en" : "en";
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/products/bulk-upload`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "", "Accept-Language": lang },
        body: formData,
      });
      clearInterval(progInterval);
      setUploadProgress(100);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `Upload failed (${res.status})`);
      setUploadResult(json.data || json);
      load();
    } catch (e) {
      clearInterval(progInterval);
      toast(e.message || "Upload failed", "error");
    } finally {
      setTimeout(() => {
        setUploadLoading(false);
        setUploadProgress(0);
        setUploadFileName("");
      }, 600);
    }
  }

  const load = useCallback(
    async (q = search) => {
      setLoading(true);
      setError("");
      try {
        const params = { page: 1, limit: 500, ...(q ? { search: q } : {}) };
        const [pRes, cRes] = await Promise.all([
          api.get("/products/admin/all", params),
          categories.length ? null : api.get("/categories/admin/all", { limit: 200 }),
        ]);
        const fetched = pRes.data || [];
        setProducts(fetched);
        if (!q) setAllProducts(fetched);
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

  useEffect(() => { load(); }, []);

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 400);
  }

  async function handleDelete(id) {
    if (!(await confirm("Delete this product?", { danger: true, confirmLabel: "Delete" }))) return;
    setDeleting(id);
    try {
      await api.delete(`/products/${id}`);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      load();
    } catch (e) {
      toast(e.message || "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }

  function onSaved(updatedProduct) {
    setModal(null);
    setStockModal(null);
    if (updatedProduct?.id) {
      setProducts((prev) => prev.map((p) => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p));
      setAllProducts((prev) => prev.map((p) => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p));
    } else {
      load();
    }
  }

  async function handleToggleFeatured(p) {
    setTogglingFeatured(p.id);
    try {
      await api.put(`/products/${p.id}`, { is_featured: !p.is_featured });
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_featured: !p.is_featured } : x));
    } catch (e) {
      toast(e.message || "Failed to update featured status", "error");
    } finally {
      setTogglingFeatured(null);
    }
  }

  async function handleToggleActive(p) {
    setTogglingActive(p.id);
    try {
      const res = await api.put(`/products/${p.id}/toggle-active`, {});
      const newActive = res?.data?.is_active ?? (p.is_active === false ? true : false);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: newActive } : x)));
    } catch (e) {
      toast(e.message || "Failed to update product status", "error");
    } finally {
      setTogglingActive(null);
    }
  }

  async function handleDuplicate(p) {
    try {
      const imgs = Array.isArray(p.image_urls) ? p.image_urls : p.image_url ? [p.image_url] : [];
      await api.post("/products", {
        name_en: `${p.name} (copy)`, brand: p.brand || undefined, sku: undefined,
        mrp: p.mrp ? parseFloat(p.mrp) : undefined,
        price: p.price ? parseFloat(p.price) : undefined,
        stock_quantity: 0,
        low_stock_threshold: p.low_stock_threshold ?? 10,
        unit: p.unit || p.variant || undefined, variant: p.variant || p.unit || undefined,
        unit_type: p.unit_type || undefined, category_id: p.category_id, description_en: p.description || undefined,
        is_active: false, is_featured: false, image_url: imgs[0] || null, image_urls: imgs,
      });
      toast("Product duplicated (inactive, 0 stock)", "success");
      load();
    } catch (e) {
      toast(e.message || "Duplicate failed", "error");
    }
  }

  async function handleBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    const ids = [...selected];
    setBulkUpdating(true);
    try {
      if (bulkAction === "delete") {
        if (!(await confirm(`Delete ${ids.length} product(s)?`, { danger: true, confirmLabel: "Delete All" }))) { setBulkUpdating(false); return; }
        await Promise.all(ids.map((id) => api.delete(`/products/${id}`)));
        toast(`${ids.length} product(s) deleted`, "success");
      } else if (bulkAction === "activate") {
        await Promise.all(ids.map((id) => api.put(`/products/${id}`, { is_active: true })));
        toast(`${ids.length} product(s) activated`, "success");
      } else if (bulkAction === "deactivate") {
        await Promise.all(ids.map((id) => api.put(`/products/${id}`, { is_active: false })));
        toast(`${ids.length} product(s) deactivated`, "success");
      } else if (bulkAction === "export") {
        handleDownloadExport([...selected]);
        setBulkUpdating(false);
        setSelected(new Set());
        setBulkAction("");
        return;
      }
      setSelected(new Set());
      setBulkAction("");
      load();
    } catch (e) {
      toast(e.message || "Bulk action failed", "error");
    } finally {
      setBulkUpdating(false);
    }
  }

  function toggleCategory(name) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const grouped = useMemo(() => {
    const childIds = new Set();
    const variantMap = {};
    for (const p of products) {
      if (p.parent_product_id) {
        childIds.add(p.id);
        if (!variantMap[p.parent_product_id]) variantMap[p.parent_product_id] = [];
        variantMap[p.parent_product_id].push(p);
      }
    }
    for (const key of Object.keys(variantMap)) {
      variantMap[key].sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    }
    const map = {};
    for (const p of products) {
      if (childIds.has(p.id)) continue;
      const key = p.parent_category_name || p.category_name;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push({ ...p, _variants: variantMap[p.id] || [] });
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, items }));
  }, [products]);

  const stats = useMemo(() => {
    const base = allProducts.length > 0 ? allProducts : products;
    const total = base.length;
    const outOfStock = base.filter((p) => (p.stock_quantity ?? 0) <= 0).length;
    const lowStock = base.filter((p) => { const s = p.stock_quantity ?? 0; return s > 0 && s <= (p.low_stock_threshold ?? 10); }).length;
    const inStock = total - outOfStock;
    const cats = new Set(base.map((p) => p.category_name || p.category_id)).size;
    const totalValue = base.reduce((s, p) => s + (parseFloat(p.price || 0) * (p.stock_quantity ?? 0)), 0);
    return { total, outOfStock, lowStock, inStock, cats, totalValue };
  }, [allProducts, products]);

  const filteredGrouped = useMemo(() => {
    let result = grouped;
    if (filterCat) result = result.filter((g) => g.name === filterCat);
    if (activeTab === "low_stock" || filterStock === "low") {
      result = result.map((g) => ({ ...g, items: g.items.filter((p) => { const s = p.stock_quantity ?? 0; return s > 0 && s <= (p.low_stock_threshold ?? 10); }) })).filter((g) => g.items.length > 0);
    } else if (activeTab === "out_of_stock" || filterStock === "out") {
      result = result.map((g) => ({ ...g, items: g.items.filter((p) => (p.stock_quantity ?? 0) <= 0) })).filter((g) => g.items.length > 0);
    } else if (filterStock === "in") {
      result = result.map((g) => ({ ...g, items: g.items.filter((p) => (p.stock_quantity ?? 0) > 10) })).filter((g) => g.items.length > 0);
    }
    // Sort
    if (sortBy !== "name_asc") {
      result = result.map((g) => {
        const sorted = [...g.items];
        if (sortBy === "name_desc") sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        else if (sortBy === "price_asc") sorted.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
        else if (sortBy === "price_desc") sorted.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
        else if (sortBy === "stock_asc") sorted.sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
        else if (sortBy === "stock_desc") sorted.sort((a, b) => (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0));
        else if (sortBy === "newest") sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return { ...g, items: sorted };
      });
    }
    return result;
  }, [grouped, activeTab, filterCat, filterStock, sortBy]);

  // Flatten for pagination
  const allFilteredProducts = useMemo(() => filteredGrouped.flatMap((g) => g.items), [filteredGrouped]);
  const totalPages = Math.max(1, Math.ceil(allFilteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => allFilteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [allFilteredProducts, page]);

  // Build paginated groups for table rendering
  const paginatedGroups = useMemo(() => {
    const pIds = new Set(paginatedProducts.map((p) => p.id));
    return filteredGrouped.map((g) => ({ ...g, items: g.items.filter((p) => pIds.has(p.id)) })).filter((g) => g.items.length > 0);
  }, [filteredGrouped, paginatedProducts]);



  function selectAllInGroup(items) {
    const ids = items.map((p) => p.id);
    setSelected((prev) => {
      const n = new Set(prev);
      const allSelected = ids.every((id) => n.has(id));
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  }

  function makeTableHead(items) {
    const allGroupSelected = items.length > 0 && items.every((p) => selected.has(p.id));
    return (
      <tr className="bg-gray-50/80 border-b border-gray-200">
        <th className="pl-4 pr-2 py-3 w-10">
          <input type="checkbox" checked={allGroupSelected} onChange={() => selectAllInGroup(items)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
        </th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Product</th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Price</th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stock</th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sales</th>
        <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
      </tr>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">Products</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage all store products</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={handleDownloadExport} disabled={downloadingExport} title="Export products"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-[13px] px-3 py-2 rounded-[10px] transition-colors disabled:opacity-60">
            {downloadingExport ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />} Export
          </button>
          <button onClick={handleDownloadTemplate} title="Download template"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-[13px] px-3 py-2 rounded-[10px] transition-colors">
            <DocumentTextIcon className="w-4 h-4" /> Template
          </button>
          <button onClick={() => uploadRef.current?.click()} disabled={uploadLoading} title="Import products"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-[13px] px-3 py-2 rounded-[10px] transition-colors disabled:opacity-60">
            {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpTrayIcon className="w-4 h-4" />} Import
          </button>
          <input ref={uploadRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadFile} />
          <button onClick={() => setModal("add")} className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-[13px] px-4 py-2 rounded-[10px] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* ── Smart Alerts ── */}
      {!loading && (stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {stats.lowStock > 0 && (
            <button onClick={() => { setActiveTab("low_stock"); setPage(1); }}
              className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-[13px] font-medium px-4 py-2 rounded-[10px] hover:bg-orange-100 transition-colors">
              <AlertTriangle className="w-4 h-4" /> {stats.lowStock} products low stock
            </button>
          )}
          {stats.outOfStock > 0 && (
            <button onClick={() => { setActiveTab("out_of_stock"); setPage(1); }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-4 py-2 rounded-[10px] hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4" /> {stats.outOfStock} products out of stock
            </button>
          )}
        </div>
      )}

      {/* ── Statistics Cards ── */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-[10px] border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Total Products</p>
              <p className="mt-1 text-[24px] font-bold text-gray-900 leading-none">{stats.total}</p>
              <p className="text-[12px] text-[#6B7280] mt-1">{stats.cats} categories</p>
            </div>
          </div>
          <div className="bg-white rounded-[10px] border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-green-50 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">In Stock</p>
              <p className="mt-1 text-[24px] font-bold text-[#16A34A] leading-none">{stats.inStock}</p>
              <p className="text-[12px] text-[#6B7280] mt-1">available</p>
            </div>
          </div>
          <div className="bg-white rounded-[10px] border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Low Stock</p>
              <p className="mt-1 text-[24px] font-bold text-[#F59E0B] leading-none">{stats.lowStock}</p>
              <p className="text-[12px] text-[#6B7280] mt-1">10 or fewer units</p>
            </div>
          </div>
          <div className="bg-white rounded-[10px] border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-red-50 flex items-center justify-center shrink-0">
              <X className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Out of Stock</p>
              <p className="mt-1 text-[24px] font-bold text-[#EF4444] leading-none">{stats.outOfStock}</p>
              <p className="text-[12px] text-[#6B7280] mt-1">need restocking</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-[10px] border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          {/* Left: Search + Filters */}
          <div className="flex flex-wrap gap-2.5 items-center w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="relative">
              <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-[10px] text-[13px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none">
                <option value="">All Categories</option>
                {grouped.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterStock} onChange={(e) => { setFilterStock(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-[10px] text-[13px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none">
                <option value="">Stock Status</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-[10px] text-[13px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none">
                <option value="name_asc">Sort: Name A-Z</option>
                <option value="name_desc">Sort: Name Z-A</option>
                <option value="price_asc">Sort: Price Low-High</option>
                <option value="price_desc">Sort: Price High-Low</option>
                <option value="stock_asc">Sort: Stock Low-High</option>
                <option value="stock_desc">Sort: Stock High-Low</option>
                <option value="newest">Sort: Newest First</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Right: Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] text-gray-600 font-medium">{selected.size} selected</span>
              <div className="relative">
                <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-gray-200 rounded-[10px] text-[13px] text-gray-600 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Bulk Actions</option>
                  <option value="activate">Activate</option>
                  <option value="deactivate">Deactivate</option>
                  <option value="export">Export Selected</option>
                  <option value="delete">Delete</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={handleBulkAction} disabled={!bulkAction || bulkUpdating}
                className="px-3 py-2 bg-gray-800 text-white text-[13px] font-medium rounded-[10px] hover:bg-gray-900 disabled:opacity-50 flex items-center gap-1.5">
                {bulkUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Apply
              </button>
              <button onClick={() => setSelected(new Set())} className="text-[13px] text-gray-500 hover:text-gray-700 underline">Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-5">
        {[
          { id: "all", label: "All Products", count: stats.total },
          { id: "low_stock", label: "Low Stock", count: stats.lowStock },
          { id: "out_of_stock", label: "Out of Stock", count: stats.outOfStock },
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setFilterStock(""); setPage(1); }}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#6B7280] hover:text-gray-700"
            }`}>
            {tab.label}
            {tab.count > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4 text-[13px] mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-blue-800">Stock Update Complete</span>
            <button onClick={() => setUploadResult(null)} className="text-blue-400 hover:text-blue-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-4 text-[12px]">
            <span className="text-blue-700 font-medium">Updated: {uploadResult.updated ?? 0}</span>
            <span className="text-red-600 font-medium">Failed: {uploadResult.failed ?? 0}</span>
            <span className="text-gray-600">Total rows: {uploadResult.total ?? 0}</span>
          </div>
          {(uploadResult.validationErrors?.length > 0 || uploadResult.updateErrors?.length > 0) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] text-red-600 underline">View errors</summary>
              <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                {[...(uploadResult.validationErrors || []), ...(uploadResult.updateErrors || [])].map((err, i) => (
                  <li key={i} className="text-[12px] text-red-700">Row {err.row}{err.name ? ` - ${err.name}` : ""}: {err.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && <p className="text-[13px] text-[#EF4444] mb-4">{error}</p>}

      {/* Summary line */}
      {!loading && paginatedGroups.length > 0 && (
        <div className="flex items-center gap-3 text-[12px] text-[#6B7280] mb-3">
          <span className="font-medium text-gray-700">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, allFilteredProducts.length)} of {allFilteredProducts.length} products
          </span>

        </div>
      )}

      {loading && (
        <div className="py-20 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#2563EB] inline" />
          <p className="text-[13px] text-[#6B7280] mt-3">Loading products...</p>
        </div>
      )}

      {!loading && filteredGrouped.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-gray-400">
            {activeTab === "low_stock" ? "No low stock products" : activeTab === "out_of_stock" ? "No out of stock products" : "No products found"}
          </p>
          <p className="text-[13px] text-gray-400 mt-1">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* ── Products Table (Category grouped) ── */}
      <div ref={tableTopRef} className="space-y-4">
        {!loading && paginatedGroups.map(({ name, items }) => {
          const isOpen = openCategories.has(name);
          const lowStockCount = items.filter((p) => { const s = p.stock_quantity ?? 0; return s > 0 && s <= (p.low_stock_threshold ?? 10); }).length;
          const outOfStockCount = items.filter((p) => (p.stock_quantity ?? 0) <= 0).length;
          return (
            <div key={name} className="bg-white rounded-[10px] border border-gray-100 shadow-sm">
              <button onClick={() => toggleCategory(name)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/80 transition-colors rounded-t-[10px]">
                <div className="flex items-center gap-3 flex-wrap">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-[#2563EB] shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  <span className="font-semibold text-gray-800 text-[14px]">{name}</span>
                  <span className="bg-blue-50 text-[#2563EB] text-[11px] font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                  {lowStockCount > 0 && <span className="bg-orange-50 text-orange-600 text-[11px] font-bold px-2 py-0.5 rounded-full">Low: {lowStockCount}</span>}
                  {outOfStockCount > 0 && <span className="bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full">Out: {outOfStockCount}</span>}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 overflow-x-auto rounded-b-[10px]">
                  <table className="w-full text-[13px]">
                    <thead>{makeTableHead(items)}</thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((p) => (
                        <ProductRow
                          key={p.id} p={p} variants={p._variants}
                          onEdit={setModal} onDelete={handleDelete} deleting={deleting}
                          onToggleFeatured={handleToggleFeatured} togglingFeatured={togglingFeatured}
                          onToggleActive={handleToggleActive} togglingActive={togglingActive}
                          onAddVariant={(parent) => setModal({ _variantParent: parent })}
                          onAdjustStock={setStockModal} onDuplicate={handleDuplicate}
                          selected={selected.has(p.id)} onSelect={toggleSelect}
                          onImageZoom={(src, alt) => setZoomImage({ src, alt })}
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

      {/* ── Pagination ── */}
      {!loading && allFilteredProducts.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <p className="text-[13px] text-[#6B7280]">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, allFilteredProducts.length)} of {allFilteredProducts.length} products
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(Math.max(1, page - 1)); tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} disabled={page <= 1}
              className="px-3 py-1.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => { setPage(pageNum); tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className={`w-9 h-9 text-[13px] font-medium rounded-lg transition-colors ${
                    page === pageNum ? "bg-[#2563EB] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => { setPage(Math.min(totalPages, page + 1)); tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} disabled={page >= totalPages}
              className="px-3 py-1.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Image Zoom ── */}
      {zoomImage && <ImageZoomPreview src={zoomImage.src} alt={zoomImage.alt} onClose={() => setZoomImage(null)} />}

      {/* ── Upload Progress Overlay ── */}
      {uploadLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">Uploading products...</p>
                {uploadFileName && <p className="text-[12px] text-gray-500 truncate mt-0.5">{uploadFileName}</p>}
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-[#2563EB] transition-all duration-300 ease-out"
                style={{ width: `${Math.round(uploadProgress)}%` }}
              />
            </div>
            <p className="text-[12px] text-gray-400 mt-2 text-right">{Math.round(uploadProgress)}%</p>
            <p className="text-[12px] text-gray-500 mt-3 text-center">Processing rows and updating stock...</p>
          </div>
        </div>
      )}

      {/* ── Stock Adjust Modal ── */}
      {stockModal && <StockAdjustModal product={stockModal} onClose={() => setStockModal(null)} onSaved={onSaved} />}

      {/* ── Product / Variant Modal ── */}
      {modal && (
        modal?._variantParent ? (
          <VariantModal parent={modal._variantParent} onClose={() => setModal(null)} onSaved={onSaved} />
        ) : (
          <ProductModal product={modal === "add" ? null : modal} categories={categories} allProducts={products}
            onClose={() => setModal(null)} onSaved={onSaved} onAddVariant={(parent) => setModal({ _variantParent: parent })} />
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef(null);
  const LIMIT = 20;

  const load = useCallback(async (opts = {}) => {
    const f = opts.filter !== undefined ? opts.filter : filter;
    const p = opts.page !== undefined ? opts.page : page;
    const q = opts.search !== undefined ? opts.search : search;
    const df = opts.dateFrom !== undefined ? opts.dateFrom : dateFrom;
    const dt = opts.dateTo !== undefined ? opts.dateTo : dateTo;
    const silent = opts.silent || false;
    if (!silent) setLoading(true);
    setError("");
    try {
      const params = { limit: LIMIT, page: p, sort: "created_at_desc" };
      if (f !== "all") params.status = f;
      if (q.trim()) params.search = q.trim();
      if (df) params.date_from = df;
      if (dt) params.date_to = dt;
      const res = await api.get("/orders", params);
      setOrders(res.data || []);
      setTotal(res.meta?.totalItems || res.meta?.total || 0);
      setSelected(new Set());
    } catch (e) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, page, search, dateFrom, dateTo]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, [page, filter, dateFrom, dateTo, load]);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load({ search: val, page: 1 });
    }, 400);
  }

  function handleFilterChange(f) {
    setFilter(f);
    setPage(1);
    setSelected(new Set());
    load({ filter: f, page: 1 });
  }

  async function updateStatus(orderId, status) {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      if (drawerOrder?.id === orderId) setDrawerOrder((d) => ({ ...d, status }));
    } catch (e) {
      toast(e.message || "Update failed", "error");
    } finally {
      setUpdating(null);
    }
  }

  async function bulkUpdate(status) {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all([...selected].map((id) => api.put(`/orders/${id}/status`, { status })));
      setOrders((prev) => prev.map((o) => (selected.has(o.id) ? { ...o, status } : o)));
      toast(`${selected.size} order${selected.size !== 1 ? "s" : ""} updated`, "success");
      setSelected(new Set());
    } catch (e) {
      toast(e.message || "Bulk update failed", "error");
    } finally {
      setBulkUpdating(false);
    }
  }

  async function openDrawer(order) {
    setDrawerOrder(order);
    setDrawerLoading(true);
    try {
      const res = await api.get(`/orders/${order.id}`);
      setDrawerOrder(res.data || order);
    } catch {
      setDrawerOrder(order);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function exportCSV() {
    try {
      const params = { limit: 1000, sort: "created_at_desc" };
      if (filter !== "all") params.status = filter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get("/orders", params);
      const rows = res.data || [];
      const header = ["Order #", "Customer", "Phone", "Items", "Amount", "Status", "Date"].join(",");
      const lines = rows.map((o) =>
        [
          o.order_number || o.id?.slice(0, 8),
          `"${o.customer_name || ""}"`,
          o.customer_phone || "",
          o.item_count ?? o.total_items ?? o.items?.length ?? 0,
          parseFloat(o.total_amount || 0).toFixed(2),
          o.status,
          fmtDate(o.created_at),
        ].join(","),
      );
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e.message || "Export failed", "error");
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const STATUS_BADGE = {
    pending:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", label: "Pending" },
    confirmed: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   label: "Confirmed" },
    ready:     { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500",  label: "Ready" },
    picked_up: { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",   label: "Picked Up" },
    cancelled: { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500",     label: "Cancelled" },
    delivered: { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",    label: "Delivered" },
  };

  function OrderBadge({ status }) {
    const s = STATUS_BADGE[status] || { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
        {s.label}
      </span>
    );
  }

  const STATUS_TABS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "ready", label: "Ready" },
    { key: "picked_up", label: "Picked" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
          >
            <Tag className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={() => { setRefreshing(true); load({ silent: true }); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* ── Search + Advanced Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by order #, customer name or phone..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); load({ dateFrom: e.target.value, page: 1 }); }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); load({ dateTo: e.target.value, page: 1 }); }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); load({ dateFrom: "", dateTo: "", page: 1 }); }} className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleFilterChange(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filter === t.key
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* ── Bulk Actions Bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex-wrap">
          <span className="text-sm font-bold text-indigo-800 shrink-0">{selected.size} selected</span>
          <div className="flex items-center gap-2 flex-wrap">
            {["confirmed", "ready", "picked_up"].map((s) => (
              <button
                key={s}
                onClick={() => bulkUpdate(s)}
                disabled={bulkUpdating}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                Mark {STATUS_BADGE[s]?.label || s}
              </button>
            ))}
            <button
              onClick={() => bulkUpdate("cancelled")}
              disabled={bulkUpdating}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {bulkUpdating && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-indigo-400 hover:text-indigo-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Orders Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selected.size === orders.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600 inline" />
                  </td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">No orders found</td>
                </tr>
              )}
              {!loading && orders.map((o) => {
                const itemNames = Array.isArray(o.item_names) && o.item_names.length > 0
                  ? o.item_names.slice(0, 2).join(", ")
                  : null;
                const itemCount = o.item_count ?? o.total_items ?? o.items?.length ?? 0;
                return (
                  <tr
                    key={o.id}
                    onClick={() => openDrawer(o)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(o.id) ? "bg-indigo-50/60" : ""}`}
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-sm text-green-700 font-bold">
                      #{o.order_number || o.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900 text-sm">{o.customer_name || o.user?.name || "—"}</p>
                      {o.customer_phone && <p className="text-xs text-gray-400 mt-0.5">{o.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-800">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                      {itemNames && <p className="text-xs text-gray-400 mt-0.5 max-w-[160px] truncate">{itemNames}{Array.isArray(o.item_names) && o.item_names.length > 2 ? ` +${o.item_names.length - 2} more` : ""}</p>}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      ₹{parseFloat(o.total_amount || 0).toFixed(0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <OrderBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <select
                          value={o.status}
                          disabled={updating === o.id || (VALID_TRANSITIONS[o.status] || []).length === 0}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="appearance-none pr-6 pl-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 cursor-pointer"
                        >
                          <option value={o.status}>{STATUS_LABELS[o.status] || o.status}</option>
                          {(VALID_TRANSITIONS[o.status] || []).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        {updating === o.id && <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-green-600" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages >= 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-bold text-gray-800">{total === 0 ? 0 : (page - 1) * LIMIT + 1}</span>
              {"–"}
              <span className="font-bold text-gray-800">{Math.min(page * LIMIT, total)}</span>
              {" of "}
              <span className="font-bold text-gray-800">{total}</span>
              {" orders"}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 text-xs font-bold disabled:opacity-30 hover:bg-gray-50 transition-all">&#171;</button>
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all">
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
                {(() => {
                  const nums = [];
                  const delta = 2;
                  const range = [];
                  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
                  nums.push(1);
                  if (range[0] > 2) nums.push("ellL");
                  range.forEach((n) => nums.push(n));
                  if (range[range.length - 1] < totalPages - 1) nums.push("ellR");
                  if (totalPages > 1) nums.push(totalPages);
                  return nums.map((n) =>
                    typeof n === "string" ? (
                      <span key={n} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                    ) : (
                      <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-all ${page === n ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{n}</button>
                    ),
                  );
                })()}
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 text-xs font-bold disabled:opacity-30 hover:bg-gray-50 transition-all">&#187;</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Order Details Drawer ── */}
      {drawerOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawerOrder(null)} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-base">Order #{drawerOrder.order_number || drawerOrder.id?.slice(0, 8)}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(drawerOrder.created_at)}</p>
              </div>
              <button onClick={() => setDrawerOrder(null)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {drawerLoading ? (
                <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-green-600 inline" /></div>
              ) : (
                <>
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status</span>
                    <OrderBadge status={drawerOrder.status} />
                  </div>

                  {/* Customer */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
                    <p className="font-semibold text-gray-900">{drawerOrder.customer_name || drawerOrder.user?.name || "—"}</p>
                    {drawerOrder.customer_phone && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{drawerOrder.customer_phone}</p>}
                    {drawerOrder.customer_email && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{drawerOrder.customer_email}</p>}
                    {drawerOrder.delivery_address && <p className="text-sm text-gray-500 mt-1">{typeof drawerOrder.delivery_address === "string" ? drawerOrder.delivery_address : [drawerOrder.delivery_address.address_line1, drawerOrder.delivery_address.city].filter(Boolean).join(", ")}</p>}
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Items</p>
                    <div className="space-y-1">
                      {Array.isArray(drawerOrder.items) && drawerOrder.items.length > 0 ? (
                        drawerOrder.items.map((item, i) => (
                          <div key={i} className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{item.product_name || item.name || "Item"}</p>
                              {item.variant && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded">
                                  {item.variant}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-sm font-bold text-gray-900">&#8377;{parseFloat(item.total || item.total_price || 0).toFixed(0)}</p>
                              <p className="text-xs text-gray-400">x{item.quantity}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">No item details available</p>
                      )}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                    {drawerOrder.subtotal && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span><span>₹{parseFloat(drawerOrder.subtotal).toFixed(0)}</span>
                      </div>
                    )}
                    {drawerOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span><span>-₹{parseFloat(drawerOrder.discount_amount).toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                      <span>Total</span><span>₹{parseFloat(drawerOrder.total_amount || 0).toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Payment */}
                  {drawerOrder.payment_method && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Payment</span>
                      <span className="text-sm font-semibold text-gray-800 capitalize">{drawerOrder.payment_method}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {drawerOrder.notes && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-yellow-700 mb-1">Customer Note</p>
                      <p className="text-sm text-yellow-900">{drawerOrder.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Actions */}
            {!drawerLoading && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {(VALID_TRANSITIONS[drawerOrder.status] || []).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(drawerOrder.id, s)}
                      disabled={updating === drawerOrder.id}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 disabled:opacity-50 transition-colors"
                    >
                      {updating === drawerOrder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : (STATUS_LABELS[s] || s)}
                    </button>
                  ))}
                  {(VALID_TRANSITIONS[drawerOrder.status] || []).length === 0 && (
                    <p className="text-xs text-gray-400">No further status updates</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
  { label: "1D", hours: 24 },
  { label: "3D", hours: 72 },
  { label: "1W", hours: 168 },
  { label: "2W", hours: 336 },
  { label: "1M", hours: 720 },
];
const PROMO_TEMPLATES = [
  {
    id: "festival_sale",
    label: "Festival Sale",
    icon: "🎉",
    defaults: { type: "festival", discount_type: "percentage", discount_value: "20", badge_text: "FESTIVAL SPECIAL" },
  },
  {
    id: "flat_discount",
    label: "Flat Discount",
    icon: "₹",
    defaults: { type: "limited_time", discount_type: "flat", discount_value: "50", badge_text: "FLAT OFF" },
  },
  {
    id: "buy1get1",
    label: "Buy 1 Get 1",
    icon: "2x",
    defaults: { type: "limited_time", discount_type: "percentage", discount_value: "50", badge_text: "B1G1 OFFER" },
  },
  {
    id: "free_item",
    label: "Free Item",
    icon: "🎁",
    defaults: { type: "limited_time", discount_type: "threshold", reward_type: "free_item", badge_text: "FREE GIFT" },
  },
  {
    id: "flash_sale",
    label: "Flash Sale",
    icon: "⚡",
    defaults: { type: "flash_sale", discount_type: "percentage", discount_value: "30", badge_text: "FLASH SALE" },
  },
  {
    id: "category_discount",
    label: "Category Discount",
    icon: "🏷",
    defaults: { type: "seasonal", discount_type: "percentage", discount_value: "15", badge_text: "CATEGORY DEAL" },
  },
];
const BRAND_COLORS = [
  { label: "Green", value: "#047857" },
  { label: "Indigo", value: "#4338CA" },
  { label: "Orange", value: "#EA580C" },
  { label: "Red", value: "#DC2626" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Teal", value: "#0D9488" },
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
  const [activeSection, setActiveSection] = useState(null);
  const [startImmediately, setStartImmediately] = useState(!promo?.starts_at);
  const [applyToAll, setApplyToAll] = useState(!(promo?.product_ids?.length > 0));
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
    banner_text: promo?.banner_text || "",
    theme_color: promo?.theme_color || "#047857",
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
    const start = startImmediately ? new Date() : (form.starts_at ? new Date(form.starts_at) : new Date());
    const end = new Date(start.getTime() + hours * 3600000);
    if (startImmediately) set("starts_at", toLocal(start.toISOString()));
    set("ends_at", toLocal(end.toISOString()));
  };
  const applyTemplate = (tpl) => {
    setForm((p) => ({ ...p, ...tpl.defaults }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-[1100px] max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#047857]/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#047857]" />
            </div>
            <div>
              <h2 className="font-bold text-[16px] text-[#111827]">{isEdit ? "Edit Promotion" : "Create Promotion"}</h2>
              <p className="text-[12px] text-gray-400">{isEdit ? "Update promotion details" : "Set up a new promotion for your store"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Templates strip */}
        <div className="px-6 py-3 border-b border-[#E5E7EB] flex-shrink-0 bg-[#F1F5F9]">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Start from a template</p>
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {PROMO_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-[#E5E7EB] text-[#111827] hover:border-[#047857] hover:text-[#047857] transition-colors whitespace-nowrap"
              >
                <span>{tpl.icon}</span> {tpl.label}
              </button>
            ))}
            <div className="w-px bg-[#E5E7EB] mx-1 flex-shrink-0" />
            {FESTIVAL_PRESETS.slice(0, 6).map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-[#E5E7EB] text-gray-600 hover:border-[#047857] hover:text-[#047857] transition-colors whitespace-nowrap"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Body: left form + right preview */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "1fr 300px" }}>
          {/* Left: scrollable form */}
          <form onSubmit={save} id="promo-form" className="overflow-y-auto p-6 space-y-4 min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#D1D5DB transparent" }}>
            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}

            {/* ── Section: Promotion Info ── */}
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "info" ? null : "info")}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F1F5F9] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><Tag className="w-4 h-4 text-indigo-600" /></div>
                  <span className="text-[14px] font-semibold text-[#111827]">Promotion Info</span>
                  {form.title && <span className="text-[12px] text-gray-400 font-normal truncate max-w-[180px]">{form.title}</span>}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeSection === "info" || activeSection === null ? "rotate-180" : ""}`} />
              </button>
              {(activeSection === "info" || activeSection === null) && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[#E5E7EB] bg-white">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Title <span className="text-red-500">*</span></label>
                    <input
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. Sankranti Special Sale"
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Description</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Describe your promotion..."
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857] transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Type</label>
                    <div className="flex flex-wrap gap-2">
                      {PROMO_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => set("type", t.value)}
                          className={`px-3.5 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${form.type === t.value ? "bg-[#047857] text-white border-[#047857]" : "border-[#E5E7EB] text-[#374151] hover:border-[#047857] hover:text-[#047857] bg-white"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section: Discount Rules ── */}
            <div className="rounded-2xl border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "discount" ? null : "discount")}
                className={`w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F1F5F9] transition-colors ${activeSection === "discount" ? "rounded-t-2xl" : "rounded-2xl"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><Tag className="w-4 h-4 text-amber-600" /></div>
                  <span className="text-[14px] font-semibold text-[#111827]">Discount Rules</span>
                  {form.discount_value && <span className="text-[12px] text-gray-400 font-normal">{form.discount_type === "percentage" ? `${form.discount_value}% off` : form.discount_type === "flat" ? `₹${form.discount_value} off` : "Threshold"}</span>}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeSection === "discount" ? "rotate-180" : ""}`} />
              </button>
              {activeSection === "discount" && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E5E7EB] bg-white space-y-4">
                  {/* Discount type selector */}
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Discount Type</label>
                    <div className="flex gap-2">
                      {[
                        { value: "percentage", label: "% Off" },
                        { value: "flat", label: "₹ Flat Off" },
                        { value: "threshold", label: "Spend & Save" },
                      ].map((dt) => (
                        <button
                          key={dt.value}
                          type="button"
                          onClick={() => set("discount_type", dt.value)}
                          className={`flex-1 py-2 rounded-xl text-[13px] font-medium border transition-all ${form.discount_type === dt.value ? "bg-[#047857] text-white border-[#047857]" : "border-[#E5E7EB] text-[#374151] bg-white hover:border-[#047857]"}`}
                        >
                          {dt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Human-readable builder */}
                  {form.discount_type !== "threshold" && (
                    <div className="bg-[#F1F5F9] rounded-xl p-4">
                      <p className="text-[12px] text-gray-500 mb-3 font-medium">Discount Value</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-gray-500">Give</span>
                        <input
                          type="number"
                          value={form.discount_value}
                          onChange={(e) => set("discount_value", e.target.value)}
                          placeholder="0"
                          className="w-24 border border-[#E5E7EB] rounded-xl px-3 py-2 text-[14px] font-bold text-[#111827] text-center focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857] bg-white"
                        />
                        <span className="text-[13px] font-semibold text-gray-500">{form.discount_type === "percentage" ? "% off" : "₹ off"}</span>
                        <span className="text-[13px] text-gray-400">on selected products</span>
                      </div>
                    </div>
                  )}

                  {form.discount_type === "threshold" && (
                    <div className="bg-[#F1F5F9] rounded-xl p-4 space-y-3">
                      <p className="text-[12px] text-gray-500 font-medium">Spend & Save Rule</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#374151]">IF customer spends</span>
                        <span className="text-gray-400">≥</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-sm">₹</span>
                          <input
                            type="number"
                            value={form.min_order_amount}
                            onChange={(e) => set("min_order_amount", e.target.value)}
                            placeholder="400"
                            className="w-24 border border-[#E5E7EB] rounded-xl px-3 py-2 text-[14px] font-bold text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#374151]">THEN give</span>
                        <select
                          value={form.reward_type}
                          onChange={(e) => set("reward_type", e.target.value)}
                          className="border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                        >
                          <option value="cash_off">₹ Cash Off</option>
                          <option value="percentage">% Percentage Off</option>
                          <option value="free_item">Free Item</option>
                        </select>
                        {(form.reward_type === "cash_off" || form.reward_type === "percentage") && (
                          <>
                            <input
                              type="number"
                              value={form.discount_value}
                              onChange={(e) => set("discount_value", e.target.value)}
                              placeholder="0"
                              className="w-20 border border-[#E5E7EB] rounded-xl px-3 py-2 text-[14px] font-bold text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                            />
                            <span className="text-[13px] text-gray-500">{form.reward_type === "percentage" ? "%" : "₹"}</span>
                          </>
                        )}
                      </div>
                      {form.reward_type === "free_item" && (
                        <div>
                          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Free Product</label>
                          {freeProductSelected ? (
                            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2">
                              {freeProductSelected.image_url && (
                                <img src={freeProductSelected.image_url} alt="" className="w-7 h-7 rounded object-contain bg-gray-50 flex-shrink-0" referrerPolicy="no-referrer" />
                              )}
                              <span className="flex-1 text-[13px] font-medium text-[#111827] truncate">
                                {freeProductSelected.name}
                                {freeProductSelected.variant && <span className="text-gray-400 ml-1 text-xs">({freeProductSelected.variant})</span>}
                              </span>
                              <button type="button" onClick={() => { setFreeProductSelected(null); set("free_product_id", ""); setFreeProductSearch(""); }} className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                value={freeProductSearch}
                                onChange={(e) => handleFreeProductSearch(e.target.value)}
                                placeholder="Search product to give free..."
                                className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                              />
                              {freeProductResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto z-50">
                                  {freeProductResults.map((p) => (
                                    <button key={p.id} type="button" onClick={() => { setFreeProductSelected(p); set("free_product_id", p.id); setFreeProductSearch(""); setFreeProductResults([]); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F1F5F9] text-left text-[13px] border-b border-gray-50 last:border-0">
                                      <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">{p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />}</div>
                                      <div className="flex-1 min-w-0"><p className="truncate font-medium">{p.name}</p>{p.variant && <p className="text-xs text-gray-400">{p.variant}</p>}</div>
                                      <span className="text-xs text-gray-400 flex-shrink-0">₹{p.price}</span>
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

                  {/* Apply to */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] font-semibold text-[#374151]">Apply To</label>
                      {!applyToAll && !loadingProducts && !suggestingProducts && selectedProducts.length > 0 && (
                        <span className="text-[11px] text-[#047857] font-medium">{selectedProducts.length} selected</span>
                      )}
                      {suggestingProducts && <span className="text-[11px] text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> suggesting...</span>}
                    </div>
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => { setApplyToAll(true); setSelectedProducts([]); setProductSearch(""); setSearchResults([]); }}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-medium border transition-all ${
                          applyToAll ? "bg-[#047857] text-white border-[#047857]" : "border-[#E5E7EB] text-[#374151] bg-white hover:border-[#047857]"
                        }`}
                      >
                        All Products
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyToAll(false)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-medium border transition-all ${
                          !applyToAll ? "bg-[#047857] text-white border-[#047857]" : "border-[#E5E7EB] text-[#374151] bg-white hover:border-[#047857]"
                        }`}
                      >
                        Selected Products
                      </button>
                    </div>
                  </div>
                  {/* Product search - only when Selected Products */}
                  {!applyToAll && (
                    <div>
                      <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Search Products</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={productSearch}
                          onChange={(e) => handleProductSearch(e.target.value)}
                          placeholder="Search products to add..."
                          className="w-full pl-9 pr-4 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                        />
                        {groupedResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto z-50">
                            {groupedResults.map((group, idx) => {
                              const first = group.variants[0];
                              const hasMultiple = group.variants.length > 1;
                              return (
                                <button key={idx} type="button" onClick={() => handleProductClick(group)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F1F5F9] text-left text-[13px] border-b border-gray-50 last:border-0">
                                  <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">{first.image_url && <img src={first.image_url} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2"><span className="truncate font-medium">{group.name}</span>{hasMultiple && <span className="flex-shrink-0 bg-[#047857]/10 text-[#047857] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{group.variants.length} variants</span>}</div>
                                    {!hasMultiple && first.variant && <p className="text-xs text-gray-400">{first.variant}</p>}
                                  </div>
                                  <span className="text-xs text-gray-400 flex-shrink-0">₹{first.price}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {loadingProducts && <div className="text-center py-2"><Loader2 className="w-5 h-5 animate-spin text-[#047857] inline" /></div>}
                      {!loadingProducts && !suggestingProducts && selectedProducts.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {selectedProducts.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E5E7EB] rounded-xl pl-2 pr-2 py-1.5">
                              {p.image_url && <img src={p.image_url} alt="" className="w-6 h-6 rounded object-contain bg-white flex-shrink-0" referrerPolicy="no-referrer" />}
                              <span className="flex-1 text-[12px] font-medium text-[#111827] min-w-0 truncate">{p.name || p.id.slice(0, 8)}{p.variant && <span className="text-gray-400 ml-1">({p.variant})</span>}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-amber-600 font-bold">Orders</label>
                                  <input type="number" min="1" placeholder="∞" value={p.deal_limit ?? ""} onChange={(e) => updateProductDealLimit(p.id, e.target.value)} className="w-12 border border-[#E5E7EB] rounded-lg px-1 py-0.5 text-[10px] text-center bg-white focus:outline-none focus:ring-1 focus:ring-[#047857]" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-purple-600 font-bold">Units</label>
                                  <input type="number" min="1" placeholder="∞" value={p.item_limit ?? ""} onChange={(e) => updateProductItemLimit(p.id, e.target.value)} className="w-12 border border-[#E5E7EB] rounded-lg px-1 py-0.5 text-[10px] text-center bg-white focus:outline-none focus:ring-1 focus:ring-[#047857]" />
                                </div>
                              </div>
                              <button type="button" onClick={() => removeProduct(p.id)} className="w-5 h-5 rounded-full bg-white border border-[#E5E7EB] hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {!loadingProducts && !suggestingProducts && selectedProducts.length === 0 && (
                        <p className="text-[12px] text-gray-400 mt-2">No products selected yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Section: Schedule ── */}
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "schedule" ? null : "schedule")}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F1F5F9] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><CalendarClock className="w-4 h-4 text-blue-600" /></div>
                  <span className="text-[14px] font-semibold text-[#111827]">Schedule</span>
                  {form.ends_at && <span className="text-[12px] text-gray-400 font-normal">Ends {new Date(form.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeSection === "schedule" ? "rotate-180" : ""}`} />
              </button>
              {activeSection === "schedule" && (
                <div className="px-5 pb-5 pt-4 border-t border-[#E5E7EB] bg-white space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-2">Quick Duration</label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_DURATIONS.map((d) => (
                        <button key={d.label} type="button" onClick={() => applyDuration(d.hours)} className="px-4 py-2 rounded-xl text-[13px] font-medium bg-[#F1F5F9] border border-[#E5E7EB] text-[#374151] hover:border-[#047857] hover:text-[#047857] transition-colors">
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={startImmediately}
                      onChange={(e) => {
                        setStartImmediately(e.target.checked);
                        if (e.target.checked) set("starts_at", toLocal(new Date().toISOString()));
                      }}
                      className="w-4 h-4 accent-[#047857] rounded"
                    />
                    <span className="text-[13px] font-medium text-[#374151]">Start Immediately</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Start Date <span className="text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={form.starts_at}
                        disabled={startImmediately}
                        onChange={(e) => set("starts_at", e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857] disabled:opacity-50 disabled:bg-[#F1F5F9]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">End Date <span className="text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={form.ends_at}
                        onChange={(e) => set("ends_at", e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section: Appearance ── */}
            <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "appearance" ? null : "appearance")}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F1F5F9] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center"><Gift className="w-4 h-4 text-purple-600" /></div>
                  <span className="text-[14px] font-semibold text-[#111827]">Appearance</span>
                  {form.badge_text && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: form.theme_color + "20", color: form.theme_color }}>{form.badge_text}</span>}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeSection === "appearance" ? "rotate-180" : ""}`} />
              </button>
              {activeSection === "appearance" && (
                <div className="px-5 pb-5 pt-4 border-t border-[#E5E7EB] bg-white space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Badge Text</label>
                      <input
                        value={form.badge_text}
                        onChange={(e) => set("badge_text", e.target.value)}
                        placeholder="FESTIVAL SPECIAL"
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Banner Text</label>
                      <input
                        value={form.banner_text}
                        onChange={(e) => set("banner_text", e.target.value)}
                        placeholder="e.g. Up to 50% off this weekend!"
                        className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                      />
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-2">Theme Color</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {BRAND_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => set("theme_color", c.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${form.theme_color === c.value ? "border-[#111827] bg-[#F1F5F9]" : "border-[#E5E7EB] bg-white hover:border-gray-400"}`}
                        >
                          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.value }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[12px] text-gray-500 font-medium">Custom color</label>
                      <input type="color" value={form.theme_color} onChange={(e) => set("theme_color", e.target.value)} className="w-9 h-9 rounded-lg border border-[#E5E7EB] cursor-pointer p-0.5" />
                      <input
                        value={form.theme_color}
                        onChange={(e) => set("theme_color", e.target.value)}
                        className="flex-1 border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857]"
                      />
                    </div>
                  </div>


                </div>
              )}
            </div>

          </form>

          {/* Right: live preview - no independent scroll, stays visible */}
          <div className="border-l border-[#E5E7EB] p-5 bg-[#F9FAFB] overflow-y-auto">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Live Preview</p>
            <PromoLivePreview form={form} mode={previewMode} onModeChange={setPreviewMode} />
          </div>
        </div>

        {/* Sticky footer - always visible, outside scroll area */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-white flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="promo_active" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-[#047857]" />
            <span className="text-[13px] text-[#374151] font-medium">Active</span>
          </label>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#374151] hover:bg-[#F1F5F9] transition-colors">
            Cancel
          </button>
          <button type="submit" form="promo-form" disabled={saving} className="px-6 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors shadow-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Promotion" : "Create Promotion"}
          </button>
        </div>
      </div>

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
                        {status === "active" && p.is_active && (
                          <span className="flex items-center gap-1 text-orange-600 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {timeLeft(p.ends_at)}
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

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "promotions", label: "Promotions", icon: Megaphone },
  { id: "users", label: "Customers", icon: Users },
  { id: "settings", label: "Settings", icon: Cog },
];
export default function AdminDashboard() {
  const { ready, admin } = useAdminGuard();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleTabChange(tabId) {
    if (tabId === "billing") {
      router.push("/admin/billing");
    } else {
      setTab(tabId);
      setSidebarOpen(false);
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-[14px] text-gray-500 mt-3">Loading dashboard...</p>
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
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* -- Mobile sidebar overlay -- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      {/* -- Sidebar -- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-[#F8FAFC] border-r border-gray-200 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar Header */}
        <div className="h-[70px] flex items-center gap-3 px-5 border-b border-gray-200 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-[16px] rounded-xl w-9 h-9 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              MK
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[16px] text-gray-900 leading-tight">MK Reddy</span>
              <span className="text-[10px] text-gray-400 -mt-0.5 font-medium uppercase tracking-wider">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
                  ${isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                {isActive && <span className="absolute left-0 w-[3px] h-6 bg-indigo-600 rounded-r-full" />}
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[14px] shrink-0">
              {(admin?.name || "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{admin?.name || "Admin"}</p>
              <p className="text-[11px] text-gray-400 truncate">{admin?.phone || admin?.email || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors font-medium">
              <Store className="w-3.5 h-3.5" /> Store
            </Link>
            <button onClick={logout} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-red-500 hover:bg-red-50 transition-colors font-medium">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* -- Main Content Area -- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="h-[70px] bg-white border-b border-gray-200 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shrink-0">
          {/* Left: Mobile menu + Search */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0">
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, orders, customers..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-gray-200 rounded-xl text-[14px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button onClick={() => { setTab("products"); }} className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Product
            </button>
            <button className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200 ml-1">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[13px]">
                {(admin?.name || "A")[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* Page header */}
          {tab === "overview" && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">{greeting}, {admin?.name?.split(" ")[0] || "Admin"}</h1>
                <p className="text-[14px] text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your store today</p>
              </div>
              <p className="text-[13px] text-gray-400">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          )}

          {tab === "overview" && <OverviewTab onSwitchTab={setTab} />}
          {tab === "products" && <ProductsTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "promotions" && <PromotionsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "settings" && <StoreSettingsTab />}
        </main>
      </div>
    </div>
  );
}

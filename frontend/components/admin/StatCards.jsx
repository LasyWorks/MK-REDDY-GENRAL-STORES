"use client";
import {
  CubeIcon as Package,
  ShoppingCartIcon as ShoppingCart,
  CurrencyRupeeIcon as CircleDollarSign,
  UsersIcon as Users,
  ArrowTrendingUpIcon as TrendingUp,
  ArrowTrendingDownIcon as TrendingDown,
  ArrowUpRightIcon as ArrowUpRight,
  ArrowPathIcon as Loader2,
  ExclamationTriangleIcon as AlertTriangle,
  ClockIcon as Clock,
} from "@heroicons/react/24/outline";

const CARDS = [
  {
    key: "products",
    label: "Total Products",
    icon: Package,
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    getValue: (s) => s?.products?.total ?? "—",
    getSub: (s) => `Limit: ${s?.products?.limit ?? "—"}`,
  },
  {
    key: "orders",
    label: "Orders Today",
    icon: ShoppingCart,
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    getValue: (s) => s?.today?.orders ?? 0,
    getSub: (s) => `Total: ${s?.orders?.total ?? 0} all-time`,
    getTrend: (s) => {
      const today = s?.today?.orders ?? 0;
      return today > 0
        ? { value: `↑ ${today} new`, direction: "up", label: "today" }
        : null;
    },
  },
  {
    key: "revenue",
    label: "Revenue Today",
    icon: CircleDollarSign,
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    getValue: (s) => fmtCurrency(s?.today?.revenue),
    getSub: (s) => `Total: ${fmtCurrency(s?.revenue?.total)}`,
    getTrend: (s) => {
      const today = s?.today?.revenue ?? 0;
      return today > 0
        ? { value: `↑ ${fmtCurrency(today)}`, direction: "up", label: "today" }
        : null;
    },
  },
  {
    key: "customers",
    label: "Customers",
    icon: Users,
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-600",
    getValue: (s) => s?.customers?.total ?? "—",
    getSub: (s) => `Limit: ${s?.customers?.limit ?? "—"}`,
  },
];

function fmtCurrency(n) {
  if (n === undefined || n === null) return "₹0";
  const num = parseFloat(n);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

function TrendBadge({ trend }) {
  if (!trend) return null;
  const isUp = trend.direction === "up";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
        isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
      }`}
    >
      {trend.value}
    </span>
  );
}

export default function StatCards({ stats, loading, onCardClick }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="w-16 h-4 bg-gray-100 rounded" />
            </div>
            <div className="w-20 h-7 bg-gray-100 rounded mt-1" />
            <div className="w-24 h-3 bg-gray-100 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(
        ({
          key,
          label,
          icon: Icon,
          color,
          bg,
          text,
          getValue,
          getSub,
          getTrend,
        }) => {
          const trend = getTrend?.(stats);
          return (
            <button
              key={key}
              onClick={() => onCardClick?.(key)}
              className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 p-5 text-left transition-all duration-200 overflow-hidden"
            >
              {/* Gradient accent */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-100 transition-opacity`}
              />

              <div className="flex items-center justify-between mb-3">
                <div className={`${bg} p-2.5 rounded-xl`}>
                  <Icon className={`w-5 h-5 ${text}`} />
                </div>
                {trend && <TrendBadge trend={trend} />}
              </div>

              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {getValue(stats)}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {getSub(stats)}
              </p>

              {/* Hover arrow */}
              <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        },
      )}
    </div>
  );
}

export function AlertCards({ stats }) {
  if (!stats) return null;
  const pending = stats?.orders?.pending ?? 0;
  const completed = stats?.orders?.completed ?? 0;
  const cancelled = stats?.orders?.cancelled ?? 0;

  return (
    <div className="flex flex-wrap gap-3">
      {pending > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm">
          <div className="relative">
            <AlertTriangle className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          </div>
          {pending} Pending Orders
        </div>
      )}
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 text-sm font-semibold">
        <ShoppingCart className="w-4 h-4" />
        {completed} Completed
      </div>
      {cancelled > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Clock className="w-4 h-4" />
          {cancelled} Cancelled
        </div>
      )}
    </div>
  );
}

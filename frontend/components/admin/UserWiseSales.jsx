"use client";
import { useState, useEffect, useCallback } from "react";
import {
  UsersIcon,
  ArrowPathIcon,
  TrophyIcon,
  ShoppingBagIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import api from "@/lib/api";

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week",  label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all",   label: "All Time" },
];

function getPeriodDates(period) {
  const today = new Date().toISOString().split("T")[0];
  if (period === "today") return { start: today, end: today };
  if (period === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { start: d.toISOString().split("T")[0], end: today };
  }
  if (period === "month") {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return { start: d.toISOString().split("T")[0], end: today };
  }
  return { start: "2020-01-01", end: today };
}

const TYPE_CONFIG = {
  wholesale: {
    label: "Wholesale",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: BuildingStorefrontIcon,
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-400",
  },
  retail: {
    label: "Retail",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    icon: UserGroupIcon,
    iconColor: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
    bar: "bg-indigo-400",
  },
};

const RANK_STYLES = [
  "bg-amber-400 text-white shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  "bg-slate-400 text-white shadow-sm",
  "bg-orange-400 text-white shadow-sm",
];

function fmt(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function UserWiseSales() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (p = period, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { start, end } = getPeriodDates(p);
      const res = await api.get("/admin/reports/customers", {
        start_date: start,
        end_date: end,
        limit: 10,
      });
      setData(res.data);
    } catch (e) {
      setError(e.message || "Failed to load user sales data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    load(period);
  }, [period]);

  function handlePeriodChange(p) {
    setPeriod(p);
    setLoading(true);
    setData(null);
  }

  const handleRefresh = () => {
    setRefreshing(true);
    load(period, true);
  };

  const maxSpent = data?.topCustomers?.length
    ? Math.max(...data.topCustomers.map((c) => c.totalSpent))
    : 1;

  const totalRevenue = data?.userTypeBreakdown?.reduce(
    (s, b) => s + b.totalRevenue,
    0,
  ) || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">User-Wise Sales</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Top customers by revenue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriodChange(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  period === p.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${refreshing ? "animate-spin text-violet-500" : ""}`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 text-sm text-red-500 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* User-type breakdown cards */}
      {!loading && data?.userTypeBreakdown?.length > 0 && (
        <div
          className={`grid gap-4 px-6 pt-5 pb-4 ${
            data.userTypeBreakdown.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {data.userTypeBreakdown.map((b) => {
            const cfg = TYPE_CONFIG[b.userType] || TYPE_CONFIG.retail;
            const Icon = cfg.icon;
            const pct = totalRevenue
              ? ((b.totalRevenue / totalRevenue) * 100).toFixed(1)
              : 0;
            return (
              <div
                key={b.userType}
                className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">{pct}% of revenue</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      Customers
                    </p>
                    <p className="text-lg font-black text-gray-900 leading-tight">
                      {b.customerCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      Orders
                    </p>
                    <p className="text-lg font-black text-gray-900 leading-tight">
                      {b.orderCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      Revenue
                    </p>
                    <p className="text-lg font-black text-gray-900 leading-tight">
                      {fmt(b.totalRevenue)}
                    </p>
                  </div>
                </div>
                {/* mini bar */}
                <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="px-6 py-10 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-7 h-7 bg-gray-100 rounded-full shrink-0" />
              <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-2 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : !data?.topCustomers?.length ? (
        <div className="text-center py-14">
          <ChartBarIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">
            No completed orders in this period
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Try selecting a wider time range
          </p>
        </div>
      ) : (
        <div className="px-6 pb-5">
          {/* Table header */}
          <div className="grid grid-cols-[28px_1fr_80px_88px_120px_100px] gap-x-4 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>#</span>
            <span>Customer</span>
            <span className="text-center">Type</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Total Spent</span>
            <span className="text-right">Share</span>
          </div>

          <div className="divide-y divide-gray-50">
            {data.topCustomers.map((c, idx) => {
              const cfg = TYPE_CONFIG[c.userType] || TYPE_CONFIG.retail;
              const pct = maxSpent ? (c.totalSpent / maxSpent) * 100 : 0;
              const totalPct = totalRevenue
                ? ((c.totalSpent / totalRevenue) * 100).toFixed(1)
                : 0;
              const initials = (c.name || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[28px_1fr_80px_88px_120px_100px] gap-x-4 items-center px-3 py-3 hover:bg-gray-50/70 rounded-xl transition-colors group"
                >
                  {/* Rank */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx < 3 ? RANK_STYLES[idx] : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {idx === 0 ? (
                      <StarIcon className="w-3 h-3 text-white" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Avatar + name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-linear-to-br ${
                        c.userType === "wholesale"
                          ? "from-amber-400 to-orange-500 text-white"
                          : "from-indigo-400 to-blue-600 text-white"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                        {c.name || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate leading-tight">
                        {c.phone || "No phone"}
                      </p>
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className="flex justify-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Orders */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-800">
                      <ShoppingBagIcon className="w-3.5 h-3.5 text-gray-400" />
                      {c.orderCount}
                    </span>
                  </div>

                  {/* Spent */}
                  <div className="text-right">
                    <span className="text-sm font-black text-gray-900">
                      {fmt(c.totalSpent)}
                    </span>
                  </div>

                  {/* Bar + % */}
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-12">
                      <div
                        className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 tabular-nums w-9 text-right">
                      {totalPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer totals */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <TrophyIcon className="w-3.5 h-3.5" />
              <span>
                Showing top {data.topCustomers.length} customers
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CurrencyRupeeIcon className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-black text-gray-800">
                {fmt(totalRevenue)}
              </span>
              <span className="text-xs text-gray-400">total revenue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

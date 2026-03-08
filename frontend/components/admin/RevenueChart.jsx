"use client";
import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowTrendingUpIcon as TrendingUp,
  ArrowPathIcon as Loader2,
  CalendarIcon as Calendar,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";

const PERIODS = [
  { id: "7d", label: "7 Days", days: 7 },
  { id: "30d", label: "30 Days", days: 30 },
  { id: "90d", label: "90 Days", days: 90 },
];

function formatDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtCurrency(n) {
  if (!n) return "₹0";
  const num = parseFloat(n);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold text-gray-900">
            {entry.name === "Orders" ? entry.value : fmtCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("area"); // area or bar

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = PERIODS.find((x) => x.id === period);
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - p.days * 86400000)
        .toISOString()
        .split("T")[0];
      const res = await api.get("/admin/reports/sales", {
        start_date: start,
        end_date: end,
        group_by: p.days > 30 ? "week" : "day",
      });
      const chartData = (res.data?.data || []).map((d) => ({
        date: formatDate(d.period),
        revenue: d.revenue,
        orders: d.orderCount,
        sales: d.sales,
      }));
      setData(chartData);
      setSummary(res.data?.summary || null);
    } catch (e) {
      console.error("Failed to load sales data:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-violet-50 p-2 rounded-xl">
            <TrendingUp className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Revenue Overview</h3>
            {summary && (
              <p className="text-xs text-gray-500">
                {fmtCurrency(summary.totalRevenue)} total ·{" "}
                {summary.totalOrders} orders
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setChartType("area")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                chartType === "area"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                chartType === "bar"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Bar
            </button>
          </div>
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === p.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-4 pb-2">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Calendar className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">No sales data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartType === "area" ? (
              <AreaChart
                data={data}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#8b5cf6",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="orders"
                  name="Orders"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary footer */}
      {summary && !loading && (
        <div className="px-6 py-3 border-t border-gray-50 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-900">
              {summary.totalOrders}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">
              Total Orders
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">
              {summary.completedOrders}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">Completed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-500">
              {summary.cancelledOrders}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">Cancelled</p>
          </div>
        </div>
      )}

      {/* Insight text */}
      {!loading && summary && data.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <TrendingUp className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700">
              <span className="font-semibold">Insight: </span>
              {fmtCurrency(summary.totalRevenue)} revenue from {summary.totalOrders} orders in the last {PERIODS.find((p) => p.id === period)?.label}.
              {summary.completedOrders > 0 && ` ${summary.completedOrders} orders completed successfully.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

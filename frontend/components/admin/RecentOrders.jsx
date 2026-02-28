"use client";
import { useState } from "react";
import {
  ShoppingCartIcon as ShoppingCart,
  ChevronDownIcon as ChevronDown,
  EyeIcon as Eye,
  ArrowPathIcon as Loader2,
  ArrowUpRightIcon as ArrowUpRight,
} from "@heroicons/react/24/outline";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  ready_for_pickup: "bg-indigo-100 text-indigo-700 border-indigo-200",
  picked_up: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready_for_pickup: "Ready",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: [],
};

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "ready_for_pickup", label: "Ready" },
  { id: "picked_up", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RecentOrders({
  orders,
  loading,
  onStatusUpdate,
  onViewAll,
}) {
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState(null);

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  async function handleStatusChange(orderId, newStatus) {
    setUpdating(orderId);
    try {
      await onStatusUpdate?.(orderId, newStatus);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-xl">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Recent Orders</h3>
            <p className="text-xs text-gray-500">
              {orders.length} orders loaded
            </p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          View All Orders
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-6 py-2 border-b border-gray-50 flex gap-1 overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map((t) => {
          const count =
            t.id === "all"
              ? orders.length
              : orders.filter((o) => o.status === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === t.id
                  ? "bg-emerald-600 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    filter === t.id ? "bg-white/20" : "bg-gray-200"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 inline" />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders found</p>
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-gray-50/50 transition-colors group cursor-default"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                      #{o.order_number || o.id?.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">
                      {o.customer_name || o.user?.name || "—"}
                    </p>
                    {o.user?.phone && (
                      <p className="text-[11px] text-gray-400">
                        {o.user.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {o.total_items ?? o.items?.length ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    ₹{parseFloat(o.total_amount || 0).toFixed(0)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {fmtDate(o.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    {VALID_TRANSITIONS[o.status]?.length > 0 ? (
                      <div className="relative">
                        <select
                          value={o.status}
                          disabled={updating === o.id}
                          onChange={(e) =>
                            handleStatusChange(o.id, e.target.value)
                          }
                          className="appearance-none pr-7 pl-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer font-medium"
                        >
                          <option value={o.status}>
                            {STATUS_LABELS[o.status]}
                          </option>
                          {VALID_TRANSITIONS[o.status].map((s) => (
                            <option key={s} value={s}>
                              → {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        {updating === o.id && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-emerald-600" />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No action
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

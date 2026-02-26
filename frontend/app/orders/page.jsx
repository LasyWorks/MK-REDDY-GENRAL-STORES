"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ShoppingBag,
  FileText,
  RefreshCw,
} from "lucide-react";
import orderService from "@/services/orderService";
const STATUS_META = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle2,
  },
  ready_for_pickup: {
    label: "Ready",
    color: "bg-indigo-100 text-indigo-700",
    icon: Package,
  },
  picked_up: {
    label: "Picked Up",
    color: "bg-green-100 text-green-700",
    icon: Truck,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-600",
    icon: XCircle,
  },
};
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getAll({ limit: 20 });
      setOrders(res.data || []);
    } catch (e) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        { }
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track your purchases and history
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        { }
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 mb-6 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        { }
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full" />
                </div>
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}
        { }
        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700">No orders yet</h2>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              Your order history will appear here once you place an order.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Start Shopping
            </Link>
          </div>
        )}
        { }
        {!loading && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all p-5 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">
                        #{order.order_number}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {order.notes && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {order.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">
                        ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.item_count
                          ? `${order.item_count} item${order.item_count > 1 ? "s" : ""}`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
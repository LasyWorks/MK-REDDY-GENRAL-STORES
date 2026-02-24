"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  FileText,
  Phone,
  MapPin,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import orderService from "@/services/orderService";

const STATUS_STEPS = [
  { key: "pending",          label: "Order Placed",    icon: Clock },
  { key: "confirmed",        label: "Confirmed",       icon: CheckCircle2 },
  { key: "ready_for_pickup", label: "Ready",           icon: Package },
  { key: "picked_up",        label: "Picked Up",       icon: Truck },
];

const STATUS_META = {
  pending:          { label: "Pending",    color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  confirmed:        { label: "Confirmed",  color: "text-blue-600 bg-blue-50 border-blue-200" },
  ready_for_pickup: { label: "Ready",      color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  picked_up:        { label: "Picked Up",  color: "text-green-600 bg-green-50 border-green-200" },
  cancelled:        { label: "Cancelled",  color: "text-red-600 bg-red-50 border-red-200" },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getById(id);
      setOrder(res.data);
    } catch (e) {
      setError(e.message || "Order not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      await orderService.cancel(id, "Customer requested cancellation");
      load();
    } catch (e) {
      alert(e.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4 animate-pulse">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-60 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-100 rounded-xl" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-orange-400 mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Order not found</h2>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <Link href="/orders" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>
      </main>
    );
  }

  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const isCancelled = order.status === "cancelled";
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">

        {/* Back */}
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Order</p>
              <h1 className="text-xl font-extrabold text-gray-900">
                #{order.order_number}
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Placed {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${meta.color}`}>
              {meta.label}
            </span>
          </div>

          {/* Progress tracker (skip for cancelled) */}
          {!isCancelled && (
            <div className="mt-6 flex items-center gap-0">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStepIdx;
                const Icon = step.icon;
                const isLast = idx === STATUS_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-200 text-gray-300"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${done ? "text-green-700" : "text-gray-400"}`}>
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mb-4 mx-1 rounded ${idx < currentStepIdx ? "bg-green-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cancellation note */}
          {isCancelled && order.cancellation_reason && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span><strong>Reason:</strong> {order.cancellation_reason}</span>
            </div>
          )}
        </div>

        {/* Order items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Items ({order.items.length})
            </h2>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shrink-0">
                    🛒
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                      {item.product_name_en}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.unit_type} · Qty {item.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">₹{parseFloat(item.total).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">₹{parseFloat(item.unit_price).toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bill summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Bill Summary</h2>
          <div className="space-y-2.5 text-sm">
            <Row label="Subtotal" value={`₹${parseFloat(order.subtotal || 0).toFixed(2)}`} />
            <Row label="GST" value={`₹${parseFloat(order.total_gst || 0).toFixed(2)}`} />
            <div className="border-t border-gray-100 pt-2.5">
              <Row label="Total" value={`₹${parseFloat(order.total_amount || 0).toFixed(2)}`} bold />
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 text-sm text-gray-600 flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
            <span>{order.notes}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel Order"}
            </button>
          )}
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Order Again
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-gray-900 text-base" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

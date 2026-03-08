"use client";
import { useState, useEffect } from "react";
import {
  ShoppingCartIcon as ShoppingCart,
  CubeIcon as Package,
  ArrowPathIcon as Loader2,
  ArrowTrendingUpIcon as TrendingUp,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import ImageWithFallback from "@/components/common/ImageWithFallback";

function fmtCurrency(n) {
  if (!n) return "₹0";
  const num = parseFloat(n);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

export default function FrequentlyBoughtProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Get frequently bought products from last 30 days
        const end = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .split("T")[0];
        const res = await api.get("/admin/reports/frequently-bought", {
          limit: 8,
          start_date: start,
          end_date: end,
        });
        setProducts(res.data?.products || []);
      } catch (e) {
        console.error("Failed to load frequently bought products:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-emerald-50 p-2 rounded-xl">
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">
            Most Purchased Products
          </h3>
          <p className="text-[11px] text-gray-500">
            By quantity - Last 30 days
          </p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No purchase data yet</p>
          </div>
        ) : null}
      </div>

      {!loading && products.length > 0 && (
        <div>
          {/* Column headers */}
          <div className="flex items-center px-5 py-2 border-b border-gray-100 bg-gray-50/60">
            <span className="w-6 text-[10px] font-semibold text-gray-400 uppercase flex-shrink-0">#</span>
            <span className="flex-1 text-[10px] font-semibold text-gray-400 uppercase pl-9">Product</span>
            <span className="w-24 text-right text-[10px] font-semibold text-gray-400 uppercase">Sold</span>
            <span className="w-20 text-right text-[10px] font-semibold text-gray-400 uppercase pr-5">Revenue</span>
          </div>
          <div className="divide-y divide-gray-50">
            {products.map((p, i) => (
              <div
                key={p.id || i}
                className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="w-6 text-xs font-bold text-gray-300 flex-shrink-0">{i + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={p.imageUrl}
                    alt={p.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 pl-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name || "Unknown"}</p>
                  <p className="text-[10px] text-gray-400">{p.orderCount} orders</p>
                </div>
                <div className="w-24 text-right flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700">{p.quantitySold}</span>
                  <span className="text-[10px] text-gray-400 ml-1">units</span>
                </div>
                <div className="w-20 text-right flex-shrink-0 pr-0">
                  <span className="text-sm font-bold text-emerald-600">{fmtCurrency(p.totalSales)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

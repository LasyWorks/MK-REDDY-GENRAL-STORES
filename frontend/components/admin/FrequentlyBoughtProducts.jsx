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

  const maxQuantity =
    products.length > 0
      ? Math.max(...products.map((p) => p.quantitySold || 0))
      : 1;

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
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p, i) => {
              const pct =
                maxQuantity > 0
                  ? ((p.quantitySold || 0) / maxQuantity) * 100
                  : 0;
              return (
                <div
                  key={p.id || i}
                  className="group bg-gray-50 hover:bg-emerald-50 rounded-xl p-3 transition-all border border-gray-100 hover:border-emerald-200"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={p.imageUrl}
                        alt={p.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                        {p.name || "Unknown"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {p.orderCount} orders
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-medium text-gray-500">
                        Quantity Sold
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        {p.quantitySold}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Revenue</span>
                      <span className="text-[11px] font-semibold text-gray-600">
                        {fmtCurrency(p.totalSales)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

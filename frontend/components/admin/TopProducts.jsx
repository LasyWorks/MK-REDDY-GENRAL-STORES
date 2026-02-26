"use client";
import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Package,
  Loader2,
  Crown,
  Star,
  ArrowUpRight,
} from "lucide-react";
import api from "@/lib/api";

function fmtCurrency(n) {
  if (!n) return "₹0";
  const num = parseFloat(n);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

export default function TopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Get top products from last 30 days
        const end = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .split("T")[0];
        const res = await api.get("/admin/reports/top-products", {
          limit: 5,
          start_date: start,
          end_date: end,
        });
        setProducts(res.data?.topProducts || []);
      } catch (e) {
        console.error("Failed to load top products:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxSales =
    products.length > 0
      ? Math.max(...products.map((p) => p.totalSales || 0))
      : 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-amber-50 p-2 rounded-xl">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Top Selling</h3>
          <p className="text-[11px] text-gray-500">Last 30 days</p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p, i) => {
              const pct =
                maxSales > 0 ? ((p.totalSales || 0) / maxSales) * 100 : 0;
              return (
                <div key={p.id || i} className="group">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold ${
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                            ? "bg-gray-100 text-gray-600"
                            : i === 2
                              ? "bg-orange-50 text-orange-600"
                              : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name || p.name_en || "Unknown"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {fmtCurrency(p.totalSales)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.quantitySold} sold
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="ml-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? "bg-amber-400" : "bg-gray-300"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
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

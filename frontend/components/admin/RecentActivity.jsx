"use client";
import {
  Activity,
  Loader2,
  Clock,
  Package,
  ShoppingCart,
  Settings,
} from "lucide-react";

const ACTION_ICONS = {
  CREATE_PRODUCT: Package,
  UPDATE_PRODUCT: Package,
  DELETE_PRODUCT: Package,
  CREATE_ORDER: ShoppingCart,
  UPDATE_ORDER: ShoppingCart,
  UPDATE_ORDER_STATUS: ShoppingCart,
  UPDATE_SYSTEM_CONFIG: Settings,
  UPDATE_GST_CONFIG: Settings,
  DEFAULT: Activity,
};

const ACTION_COLORS = {
  CREATE_PRODUCT: "bg-blue-100 text-blue-600",
  UPDATE_PRODUCT: "bg-amber-100 text-amber-600",
  DELETE_PRODUCT: "bg-red-100 text-red-600",
  CREATE_ORDER: "bg-emerald-100 text-emerald-600",
  UPDATE_ORDER: "bg-blue-100 text-blue-600",
  UPDATE_ORDER_STATUS: "bg-indigo-100 text-indigo-600",
  UPDATE_SYSTEM_CONFIG: "bg-gray-100 text-gray-600",
  UPDATE_GST_CONFIG: "bg-gray-100 text-gray-600",
  DEFAULT: "bg-gray-100 text-gray-600",
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatAction(action) {
  return (action || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

// initialActivity comes from the dashboard stats fetch — no separate API call needed.
// statsLoading: true while parent is still fetching stats.
export default function RecentActivity({
  initialActivity,
  statsLoading = false,
}) {
  const activities = initialActivity || [];
  // Show skeleton while parent hasn't resolved yet (initialActivity is still undefined)
  const loading = statsLoading || initialActivity === undefined;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-indigo-50 p-2 rounded-xl">
          <Activity className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Recent Activity</h3>
          <p className="text-[11px] text-gray-500">Admin actions log</p>
        </div>
      </div>

      <div className="p-4 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100" />

            <div className="space-y-4">
              {activities.map((a, i) => {
                const IconComp = ACTION_ICONS[a.action] || ACTION_ICONS.DEFAULT;
                const colorClass =
                  ACTION_COLORS[a.action] || ACTION_COLORS.DEFAULT;
                return (
                  <div key={a.id || i} className="flex gap-3 relative">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass} z-10`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {formatAction(a.action)}
                      </p>
                      {a.entity_type && (
                        <p className="text-[11px] text-gray-500 truncate">
                          {a.entity_type}
                          {a.entity_id && (
                            <span className="text-gray-400">
                              {" "}
                              #{a.entity_id?.slice(0, 8)}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  Mail,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Edit3,
  Shield,
  Package,
} from "lucide-react";
import authService from "@/services/authService";
import orderService from "@/services/orderService";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Guard: only redirect after we've confirmed no valid session
    if (!authService.isAuthenticated()) {
      setAuthChecked(true);
      router.replace("/login");
      return;
    }
    const u = authService.getCurrentUser();
    if (!u) {
      // Token exists but user object missing — clear stale token and redirect
      authService.logout().catch(() => {});
      setAuthChecked(true);
      router.replace("/login");
      return;
    }
    setUser(u);
    setAuthChecked(true);

    // Fetch order count
    orderService
      .getAll({ limit: 1 })
      .then((res) => {
        const total = res.pagination?.total ?? (res.data?.length || 0);
        setOrderCount(total);
      })
      .catch(() => setOrderCount(0));
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await authService.logout();
    router.replace("/");
  };

  // Show nothing until auth check is done to prevent flash
  if (!authChecked || !user) return null;

  // Derive initials from name
  const initials = user.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

  const userTypeLabel =
    user.user_type === "wholesale"
      ? "Wholesale"
      : user.user_type === "admin"
      ? "Admin"
      : "Retail";

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 sm:px-6 space-y-4">

        {/* Avatar + name card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg shadow-blue-200 p-6 text-white">
          <div className="flex items-center gap-4">
            {/* Avatar circle */}
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-extrabold text-white ring-4 ring-white/30 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight truncate">
                {user.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  {userTypeLabel} Customer
                </span>
                {user.is_active && (
                  <span className="text-xs bg-green-400/30 text-green-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/20">
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-extrabold">
                {orderCount === null ? (
                  <span className="inline-block w-8 h-6 bg-white/20 animate-pulse rounded" />
                ) : (
                  orderCount
                )}
              </p>
              <p className="text-xs text-blue-100 font-medium mt-0.5">Orders</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-extrabold">
                {userTypeLabel}
              </p>
              <p className="text-xs text-blue-100 font-medium mt-0.5">Account Type</p>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <p className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Contact Details
          </p>

          {user.phone && (
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
          )}
          {user.email && (
            <InfoRow icon={Mail} label="Email" value={user.email} />
          )}
          {user.address && (
            <InfoRow icon={MapPin} label="Address" value={user.address} />
          )}
          {!user.phone && !user.email && !user.address && (
            <div className="px-5 py-4 text-sm text-gray-400">
              No contact details on file.
            </div>
          )}
        </div>

        {/* Navigation links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <p className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Account
          </p>

          <NavLink href="/orders" icon={Package} label="My Orders" sub={orderCount !== null ? `${orderCount} order${orderCount !== 1 ? "s" : ""}` : undefined} />
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {loggingOut ? "Signing out…" : "Sign Out"}
            </span>
          </button>
        </div>

        {/* Branding footnote */}
        <p className="text-center text-xs text-gray-400 pb-4">
          MK Reddy General Store · Your daily essentials
        </p>
      </div>
    </main>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, label, sub }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
    </Link>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBagIcon,
  ArrowLeftOnRectangleIcon,
  ChevronRightIcon,
  CubeIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  Cog6ToothIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import authService from "@/services/authService";
import orderService from "@/services/orderService";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setAuthChecked(true);
      router.replace("/login");
      return;
    }
    const u = authService.getCurrentUser();
    if (!u) {
      authService.logout().catch(() => {});
      setAuthChecked(true);
      router.replace("/login");
      return;
    }
    setUser(u);
    setAuthChecked(true);
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
    try {
      await authService.logout();
    } catch {}
    router.replace("/");
  };

  if (!authChecked || !user) return null;

  const isAdmin = user.user_type === "admin";
  const isWholesale = user.user_type === "wholesale";

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  const roleLabel = isAdmin ? "Admin" : isWholesale ? "Wholesale" : "Customer";
  const roleBadge = isAdmin
    ? "bg-amber-100 text-amber-700 border border-amber-200"
    : isWholesale
      ? "bg-purple-100 text-purple-700 border border-purple-200"
      : "bg-green-100 text-green-700 border border-green-200";
  const avatarBg = isAdmin
    ? "from-amber-400 to-orange-500"
    : isWholesale
      ? "from-purple-500 to-violet-600"
      : "from-green-500 to-emerald-600";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600 rotate-180" />
          </button>
          <h1 className="text-base font-bold text-gray-900">My Profile</h1>
          <div className="w-9" aria-hidden="true" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-3">
        {/* ── Profile header card ─────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-16 h-16 rounded-full bg-linear-to-br ${avatarBg}
                               flex items-center justify-center text-white text-xl font-black select-none shadow-md`}
              >
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </div>
              {user.is_active && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-green-500
                                border-2 border-white flex items-center justify-center shadow"
                >
                  <CheckBadgeIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Name / email / badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">
                  {user.name}
                </h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${roleBadge}`}
                >
                  {roleLabel}
                </span>
              </div>
              {user.email && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {user.email}
                </p>
              )}
              {user.phone && (
                <p className="text-sm text-gray-500 truncate">{user.phone}</p>
              )}
            </div>
          </div>

          {/* Orders stat strip */}
          <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
            <StatStrip
              label="Orders"
              value={
                orderCount === null ? (
                  <span className="inline-block w-8 h-4 bg-gray-100 animate-pulse rounded" />
                ) : (
                  orderCount
                )
              }
            />
            <StatStrip label="Account" value={roleLabel} />
            <StatStrip
              label="Status"
              value={
                <span
                  className={`text-xs font-bold ${user.is_active ? "text-green-600" : "text-red-500"}`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              }
            />
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────── */}
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          <NavRow
            href="/orders"
            icon={ShoppingBagIcon}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            label="My Orders"
            meta={
              orderCount !== null && orderCount > 0 ? (
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {orderCount}
                </span>
              ) : null
            }
          />
          <NavRow
            href="/"
            icon={BuildingStorefrontIcon}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            label="Browse Store"
          />
          <NavRow
            href="/orders"
            icon={TruckIcon}
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
            label="Track Orders"
          />
        </div>

        {/* ── Admin Tools ──────────────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionLabel badge="Admin Only">Admin Tools</SectionLabel>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-amber-100">
              <NavRow
                href="/admin/dashboard"
                icon={Squares2X2Icon}
                iconBg="bg-amber-100"
                iconColor="text-amber-700"
                label="Dashboard"
                sub="Analytics & revenue overview"
              />
              <NavRow
                href="/admin/dashboard?tab=products"
                icon={CubeIcon}
                iconBg="bg-amber-100"
                iconColor="text-amber-700"
                label="Product Management"
                sub="Add, edit & manage inventory"
              />
              <NavRow
                href="/admin/dashboard?tab=orders"
                icon={ClipboardDocumentListIcon}
                iconBg="bg-amber-100"
                iconColor="text-amber-700"
                label="Order Management"
                sub="View & update customer orders"
              />
            </div>
          </>
        )}

        {/* ── Account Settings ─────────────────────────────────── */}
        <SectionLabel>Account</SectionLabel>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {user.email && (
            <NavRow
              icon={EnvelopeIcon}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              label="Email"
              sub={user.email}
              noChevron
            />
          )}
          {user.phone && (
            <NavRow
              icon={PhoneIcon}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              label="Phone"
              sub={user.phone}
              noChevron
            />
          )}
          {user.address && (
            <NavRow
              icon={MapPinIcon}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              label="Address"
              sub={user.address}
              noChevron
            />
          )}
          <NavRow
            href="/profile"
            icon={Cog6ToothIcon}
            iconBg="bg-gray-100"
            iconColor="text-gray-600"
            label="Account Settings"
            sub="Manage profile & preferences"
          />
        </div>

        {/* ── Sign Out ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Sign out"
            className="w-full flex items-center gap-4 px-5 py-4
                       hover:bg-red-50 active:bg-red-100 transition-colors
                       disabled:opacity-50 group"
          >
            <div className="w-11 h-11 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
              <ArrowLeftOnRectangleIcon className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-red-600">
                {loggingOut ? "Signing out…" : "Sign Out"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                You will be returned to the home page
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-2">
          MK Reddy General Store &middot; Your daily essentials
        </p>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function SectionLabel({ children, badge }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-1">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
        {children}
      </p>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wide">
          {badge}
        </span>
      )}
    </div>
  );
}

function StatStrip({ label, value }) {
  return (
    <div className="flex flex-col items-center py-3 px-2">
      <p className="text-base font-black text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 font-medium mt-1 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function NavRow({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  label,
  sub,
  meta,
  noChevron,
}) {
  const cls = `flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100
               transition-colors group min-h-[56px]`;
  const inner = (
    <>
      <div
        className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 transition-colors`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight">
          {label}
        </p>
        {sub && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug truncate">
            {sub}
          </p>
        )}
      </div>
      {meta && <div className="shrink-0">{meta}</div>}
      {!noChevron && (
        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
      )}
    </>
  );

  if (!href || noChevron) {
    return <div className={cls}>{inner}</div>;
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

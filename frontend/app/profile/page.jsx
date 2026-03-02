"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ArrowLeftOnRectangleIcon,
  ChevronRightIcon,
  CubeIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  FingerPrintIcon,
  CheckCircleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ShieldCheckIcon,
  CheckBadgeIcon,
  TagIcon,
  SparklesIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
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
    await authService.logout();
    router.replace("/");
  };

  if (!authChecked || !user) return null;

  const isAdmin     = user.user_type === "admin";
  const isWholesale = user.user_type === "wholesale";

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  const roleLabel = isAdmin ? "Admin" : isWholesale ? "Wholesale" : "Retail";

  /* ── Per-role design tokens ──────────────────────────────────────── */
  const theme = isAdmin
    ? {
        heroBg:     "from-[#0f0c29] via-[#1a1a3e] to-[#24243e]",
        avatarGrad: "from-violet-500 via-indigo-500 to-blue-600",
        glow:       "rgba(139,92,246,0.45)",
        ring:       "ring-violet-500/40",
        accentText: "text-violet-300",
        badge:      "bg-violet-500/20 text-violet-200 border-violet-500/30",
        verBadge:   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        statBorder: "border-t-violet-500",
        adminBadge: "bg-amber-400/20 text-amber-300 border-amber-400/30",
        adminText:  "text-amber-300",
      }
    : isWholesale
    ? {
        heroBg:     "from-[#0a0a1a] via-[#1e1333] to-[#130d2e]",
        avatarGrad: "from-fuchsia-500 via-purple-500 to-violet-600",
        glow:       "rgba(217,70,239,0.40)",
        ring:       "ring-fuchsia-500/40",
        accentText: "text-fuchsia-300",
        badge:      "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/30",
        verBadge:   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        statBorder: "border-t-fuchsia-500",
        adminBadge: null,
        adminText:  null,
      }
    : {
        heroBg:     "from-[#0d1b2a] via-[#0f2847] to-[#0d1b2a]",
        avatarGrad: "from-sky-400 via-blue-500 to-indigo-600",
        glow:       "rgba(56,189,248,0.40)",
        ring:       "ring-sky-500/40",
        accentText: "text-sky-300",
        badge:      "bg-sky-500/20 text-sky-200 border-sky-500/30",
        verBadge:   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        statBorder: "border-t-sky-500",
        adminBadge: null,
        adminText:  null,
      };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className={`bg-linear-to-br ${theme.heroBg} relative overflow-hidden`}>
        {/* Decorative orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
             style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }} />
        <div className="absolute -bottom-20 right-10 w-72 h-72 rounded-full opacity-20 blur-3xl"
             style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }} />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-12 pb-24">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 rounded-full p-0.75"
                   style={{ background: `conic-gradient(from 180deg, ${theme.glow.replace("0.4", "0.9")}, transparent 60%)` }}>
                <div className={`w-full h-full rounded-full bg-linear-to-br ${theme.avatarGrad}
                                 flex items-center justify-center text-white text-3xl font-black select-none
                                 shadow-2xl ring-2 ${theme.ring}`}
                     style={{ letterSpacing: "-1px" }}>
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
              </div>
              {user.is_active && (
                <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full
                                bg-linear-to-br from-emerald-400 to-emerald-600
                                border-2 border-[#0f0c29] flex items-center justify-center
                                shadow-[0_0_12px_rgba(16,185,129,0.7)]">
                  <CheckBadgeIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${theme.badge}`}>
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  {roleLabel}
                </span>
                {isAdmin && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${theme.adminBadge}`}>
                    <StarIcon className="w-3.5 h-3.5" />
                    Full Admin
                  </span>
                )}
                {user.is_active && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${theme.verBadge}`}>
                    <CheckBadgeIcon className="w-3.5 h-3.5" />
                    Verified Account
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                {user.name}
              </h1>
              {user.email && (
                <p className="text-sm text-slate-400 mt-1.5 font-medium">{user.email}</p>
              )}
            </div>

            {/* Sign out — desktop */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-white/8 hover:bg-white/15 border border-white/15
                         text-slate-300 hover:text-white transition-all text-sm font-semibold
                         disabled:opacity-40 backdrop-blur-sm shrink-0"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>

          {/* Stat tiles */}
          <div className={`grid gap-3 mt-9 grid-cols-2 ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <StatTile
              icon={ShoppingBagIcon}
              label="Total Orders"
              value={orderCount === null
                ? <span className="inline-block w-10 h-6 bg-white/10 animate-pulse rounded-lg" />
                : orderCount}
              accentClass={theme.accentText}
              borderClass={theme.statBorder}
            />
            <StatTile
              icon={TagIcon}
              label="Account Type"
              value={roleLabel}
              accentClass={theme.accentText}
              borderClass={theme.statBorder}
            />
            <StatTile
              icon={BuildingStorefrontIcon}
              label="Store"
              value="MK Reddy"
              accentClass={theme.accentText}
              borderClass={theme.statBorder}
            />
            {isAdmin && (
              <StatTile
                icon={SparklesIcon}
                label="Access Level"
                value="Full Admin"
                accentClass="text-amber-300"
                borderClass="border-t-amber-400"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 -mt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Contact Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Contact Details" />
              <div className="divide-y divide-gray-50">
                {user.phone  && <InfoRow icon={PhoneIcon}    label="Phone"   value={user.phone}   color="blue"    />}
                {user.email  && <InfoRow icon={EnvelopeIcon} label="Email"   value={user.email}   color="violet"  />}
                {user.address && <InfoRow icon={MapPinIcon}  label="Address" value={user.address} color="emerald" />}
                {!user.phone && !user.email && !user.address && (
                  <p className="px-5 py-4 text-sm text-gray-400">No contact details on file.</p>
                )}
              </div>
            </div>

            {/* Account Info Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Account Info" />
              <div className="px-5 py-4 space-y-3">
                <InfoPair
                  label="Member Since"
                  icon={CalendarDaysIcon}
                  value={user.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
                    : "—"}
                />
                <InfoPair
                  label="User ID"
                  icon={FingerPrintIcon}
                  value={user.id ? `#${String(user.id).slice(0, 8).toUpperCase()}` : "—"}
                />
                <InfoPair
                  label="Status"
                  icon={CheckCircleIcon}
                  value={
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      user.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Sign Out — mobile */}
            <div className="sm:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-red-50/60 transition-colors disabled:opacity-50 group"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                  <ArrowLeftOnRectangleIcon className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-red-600">{loggingOut ? "Signing out…" : "Sign Out"}</p>
                  <p className="text-xs text-gray-400">You will be returned to the home page</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN (spans 2) ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Admin Panel */}
            {isAdmin && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <SectionHeader
                  title="Admin Panel"
                  badge={
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full
                                     bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                      Admin Only
                    </span>
                  }
                />
                <div className="divide-y divide-gray-50">
                  <NavItem
                    href="/admin/dashboard"
                    icon={Squares2X2Icon}
                    label="Dashboard"
                    description="Analytics, revenue overview and store insights"
                    iconColor="violet"
                  />
                  <NavItem
                    href="/admin/dashboard?tab=products"
                    icon={CubeIcon}
                    label="Product Management"
                    description="Add, edit, delete products and manage inventory stock"
                    iconColor="emerald"
                  />
                  <NavItem
                    href="/admin/dashboard?tab=orders"
                    icon={ClipboardDocumentListIcon}
                    label="Order Management"
                    description="View, update status and manage all customer orders"
                    iconColor="blue"
                  />
                </div>
              </div>
            )}

            {/* My Account */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="My Account" />
              <div className="divide-y divide-gray-50">
                <NavItem
                  href="/orders"
                  icon={ShoppingBagIcon}
                  label="My Orders"
                  iconColor="indigo"
                  description={orderCount !== null
                    ? `${orderCount} order${orderCount !== 1 ? "s" : ""} placed in total`
                    : "Track your deliveries and past orders"}
                  badge={orderCount !== null && orderCount > 0
                    ? <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">{orderCount}</span>
                    : null}
                />
                <NavItem
                  href="/"
                  icon={BuildingStorefrontIcon}
                  label="Browse Store"
                  iconColor="teal"
                  description="Shop groceries, essentials, beverages and more"
                />
                <NavItem
                  href="/profile"
                  icon={UserCircleIcon}
                  label="Account Settings"
                  iconColor="slate"
                  description="Manage your profile and preferences"
                />
              </div>
            </div>

            {/* Sign Out — desktop  */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Session" />
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Sign out of your account</p>
                    <p className="text-xs text-gray-400 mt-0.5">You will be logged out and returned to the home page.</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl
                               bg-red-50 hover:bg-red-100 border border-red-200
                               text-red-600 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                    {loggingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-10">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <BuildingStorefrontIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-xs text-gray-400 font-medium">
            MK Reddy General Store &middot; Your daily essentials
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StatTile({ icon: Icon, label, value, accentClass, borderClass }) {
  return (
    <div className={`bg-white/8 backdrop-blur-sm border border-white/12 border-t-2 ${borderClass} rounded-2xl px-5 py-4 hover:bg-white/12 transition-colors`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className={`w-4 h-4 ${accentClass}`} />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</span>
      </div>
      <p className="text-2xl font-black text-white leading-none tracking-tight">{value}</p>
    </div>
  );
}

function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2.5">
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      {badge}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, color = "slate" }) {
  const map = {
    blue:    { bg: "bg-blue-50",    border: "border-blue-100",    icon: "text-blue-500"    },
    violet:  { bg: "bg-violet-50",  border: "border-violet-100",  icon: "text-violet-500"  },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-500" },
    slate:   { bg: "bg-slate-50",   border: "border-slate-100",   icon: "text-slate-400"   },
  };
  const c = map[color] ?? map.slate;
  return (
    <div className="flex items-start gap-4 px-5 py-3.5">
      <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 wrap-break-word leading-snug">{value}</p>
      </div>
    </div>
  );
}

function InfoPair({ label, icon: Icon, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        <span className="text-xs font-semibold text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, description, badge, iconColor = "indigo" }) {
  const map = {
    indigo:  { tile: "bg-indigo-50  group-hover:bg-indigo-100",  icon: "text-indigo-600",  hover: "hover:bg-indigo-50/50"  },
    violet:  { tile: "bg-violet-50  group-hover:bg-violet-100",  icon: "text-violet-600",  hover: "hover:bg-violet-50/50"  },
    emerald: { tile: "bg-emerald-50 group-hover:bg-emerald-100", icon: "text-emerald-600", hover: "hover:bg-emerald-50/50" },
    blue:    { tile: "bg-blue-50    group-hover:bg-blue-100",    icon: "text-blue-600",    hover: "hover:bg-blue-50/50"    },
    teal:    { tile: "bg-teal-50    group-hover:bg-teal-100",    icon: "text-teal-600",    hover: "hover:bg-teal-50/50"    },
    slate:   { tile: "bg-slate-50   group-hover:bg-slate-100",   icon: "text-slate-500",   hover: "hover:bg-slate-50/50"   },
  };
  const c = map[iconColor] ?? map.indigo;
  return (
    <Link href={href}
      className={`flex items-center gap-4 px-5 py-4 ${c.hover} transition-colors group`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.tile} flex items-center justify-center shrink-0 transition-colors shadow-sm`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
      <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
    </Link>
  );
}
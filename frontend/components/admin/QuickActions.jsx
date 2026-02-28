"use client";
import {
  PlusIcon as Plus,
  ShoppingCartIcon as ShoppingCart,
  CubeIcon as Package,
  UsersIcon as Users,
  MegaphoneIcon as Megaphone,
  ArrowDownTrayIcon as Download,
  ArrowUpRightIcon as ArrowUpRight,
} from "@heroicons/react/24/outline";

const ACTIONS = [
  {
    label: "Add Product",
    icon: Plus,
    color: "bg-blue-600 hover:bg-blue-700 text-white",
    tab: "products",
    action: "add",
  },
  {
    label: "View Orders",
    icon: ShoppingCart,
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
    tab: "orders",
  },
  {
    label: "New Promotion",
    icon: Megaphone,
    color: "bg-orange-600 hover:bg-orange-700 text-white",
    tab: "promotions",
    action: "add",
  },
  {
    label: "Manage Users",
    icon: Users,
    color: "bg-violet-600 hover:bg-violet-700 text-white",
    tab: "users",
  },
];

export default function QuickActions({ onNavigate }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACTIONS.map(({ label, icon: Icon, color, tab, action }) => (
        <button
          key={label}
          onClick={() => onNavigate?.(tab, action)}
          className={`${color} rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98]`}
        >
          <Icon className="w-4.5 h-4.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

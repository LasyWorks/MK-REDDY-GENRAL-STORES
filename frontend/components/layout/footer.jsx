import Link from "next/link";
import {
  MapPinIcon as MapPin,
  PhoneIcon as Phone,
  EnvelopeIcon as Mail,
  ClockIcon as Clock,
  ShoppingBagIcon as ShoppingBag,
  ShieldCheckIcon as Shield,
  TruckIcon as Truck,
  ArrowPathIcon as RotateCcw,
} from "@heroicons/react/24/outline";

const USP = [
  { icon: Truck, label: "Home Delivery", sub: "Delivered to your doorstep" },
  { icon: Shield, label: "100% Genuine", sub: "Verified products only" },
  {
    icon: RotateCcw,
    label: "Freshness Guarantee",
    sub: "Fresh products always",
  },
  { icon: ShoppingBag, label: "Best Prices", sub: "Lowest price guaranteed" },
];

export default function Footer() {
  return (
    <footer className="hidden md:block bg-gray-900 text-gray-300 print:hidden">
      {/* USP strip */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {USP.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-lg shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600 text-white font-bold text-xl rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
                MK
              </div>
              <div>
                <p className="font-bold text-white text-lg leading-tight">
                  MK Reddy
                </p>
                <p className="text-xs text-gray-400">General Stores</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              Your trusted neighbourhood grocery store in Nellore, Andhra
              Pradesh. Fresh products, genuine brands, delivered fast.
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5 text-gray-400">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                <span>
                  1/05, Mallikarjuna Puram, Sri Potti Sriramulu Nellore, Andhra
                  Pradesh – 524311
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-400">
                <Phone className="w-4 h-4 shrink-0 text-blue-400" />
                <a
                  href="tel:+919346586105"
                  className="hover:text-white transition-colors"
                >
                  +91 93465 86105
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-gray-400">
                <Mail className="w-4 h-4 shrink-0 text-blue-400" />
                <a
                  href="mailto:anuradhap1784@gmail.com"
                  className="hover:text-white transition-colors"
                >
                  anuradhap1784@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-gray-400">
                <Clock className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Mon – Sun: 7:00 AM – 10:00 PM</span>
              </div>
            </div>
          </div>

          {/* Policies & GST */}
          <div className="flex flex-col sm:flex-row gap-10">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Policies
              </h3>
              <ul className="space-y-2.5 mb-6">
                {[
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms & Conditions", href: "#" },
                  { label: "Refund Policy", href: "#" },
                  { label: "Shipping Policy", href: "#" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors inline-block"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1">
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  GST Registration
                </p>
                <p className="text-sm font-mono text-white font-semibold">
                  37DYCPA5677L1Z0
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Registered under GST, Andhra Pradesh
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} MK Reddy General Stores. All rights
            reserved.
          </p>
          <p className="text-xs text-gray-500">
            Developed by{" "}
            <span className="text-blue-400 font-semibold">LasyWorks</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

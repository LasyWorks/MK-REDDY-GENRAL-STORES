import Link from "next/link";
import { Home, Search, ShoppingCart, ArrowRight } from "lucide-react";
export default function NotFound() {
  const suggestions = [
    { label: "Fresh Vegetables", href: "/categories/vegetables", emoji: "🥦" },
    { label: "Dairy & Eggs",      href: "/categories/dairy",      emoji: "🥛" },
    { label: "Snacks & Drinks",   href: "/categories/snacks",     emoji: "🧃" },
    { label: "Cooking Essentials",href: "/categories/cooking",    emoji: "🫙" },
  ];
  return (
    <main className="min-h-[80vh] bg-gradient-to-b from-blue-50/40 to-white flex flex-col items-center justify-center px-4 py-20 text-center">
      { }
      <div className="relative mb-8 select-none">
        <span
          className="text-8xl sm:text-9xl block animate-bounce"
          role="img"
          aria-label="Empty shopping cart"
        >
          🛒
        </span>
      </div>
      { }
      <p className="text-sm font-bold tracking-[0.3em] text-blue-400 uppercase mb-2">
        Error 404
      </p>
      { }
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
        Aisle not found!
      </h1>
      { }
      <p className="text-gray-500 text-base sm:text-lg max-w-md mb-10 leading-relaxed">
        Looks like this page wandered off to the wrong shelf. Don't worry — our
        store is fully stocked. Let's get you back on track.
      </p>
      { }
      <div className="flex flex-col sm:flex-row gap-3 mb-12">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
        >
          <Home className="w-4 h-4" />
          Back to Store
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all active:scale-95"
        >
          <Search className="w-4 h-4" />
          Search Products
        </Link>
      </div>
      { }
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Popular categories
        </p>
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map(({ label, href, emoji }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 bg-white border border-gray-100 hover:border-blue-300 hover:shadow-md rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all group"
            >
              <span className="text-xl">{emoji}</span>
              <span className="flex-1 text-left">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
      { }
      <div className="mt-16 flex items-center gap-2 text-gray-400 text-sm">
        <div className="bg-blue-600 text-white font-bold text-xs rounded-md w-6 h-6 flex items-center justify-center shrink-0">
          MK
        </div>
        <span>MK Reddy General Store</span>
        <span className="text-gray-200">•</span>
        <span>Your daily essentials, delivered</span>
      </div>
    </main>
  );
}
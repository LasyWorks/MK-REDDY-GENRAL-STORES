"use client";
import { useEffect } from "react";
import {
  ArrowPathIcon as RefreshCw,
  HomeIcon as Home,
  ExclamationTriangleIcon as AlertTriangle,
} from "@heroicons/react/24/outline";
import Link from "next/link";
export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);
  return (
    <main className="min-h-[80vh] bg-gradient-to-b from-orange-50/30 to-white flex flex-col items-center justify-center px-4 py-20 text-center">
      {}
      <div className="relative mb-8 select-none">
        <span
          className="text-8xl sm:text-9xl block"
          role="img"
          aria-label="Spilled grocery bag"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.10))" }}
        >
          🛍️
        </span>
        <span className="absolute -bottom-2 -right-4 text-4xl animate-pulse">
          ⚠️
        </span>
      </div>
      {}
      <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
        <AlertTriangle className="w-3.5 h-3.5" />
        Something went wrong
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
        We dropped the groceries!
      </h1>
      <p className="text-gray-500 text-base sm:text-lg max-w-md mb-4 leading-relaxed">
        Our team has been notified and is cleaning this up. In the meantime, try
        refreshing or head back to the store.
      </p>
      {}
      {process.env.NODE_ENV === "development" && error?.message && (
        <pre className="mb-6 bg-gray-900 text-red-400 text-xs rounded-xl px-5 py-4 max-w-lg w-full text-left overflow-auto whitespace-pre-wrap break-all shadow-inner">
          {error.message}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      )}
      {}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all active:scale-95"
        >
          <Home className="w-4 h-4" />
          Go to Store
        </Link>
      </div>
      {}
      <p className="mt-12 text-xs text-gray-400">
        Your cart items are safe — no orders were affected.
      </p>
      {}
      <div className="mt-6 flex items-center gap-2 text-gray-400 text-sm">
        <div className="bg-blue-600 text-white font-bold text-xs rounded-md w-6 h-6 flex items-center justify-center shrink-0">
          MK
        </div>
        <span>MK Reddy General Store</span>
      </div>
    </main>
  );
}

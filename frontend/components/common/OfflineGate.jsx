"use client";

import { useEffect, useState } from "react";

export default function OfflineGate() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);

    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);

    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-50 to-slate-200 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl p-8 text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold">
          !
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">No Internet Connection</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Please check your network and try again. We will bring the store back automatically once connection is restored.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#16a34a] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803d]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

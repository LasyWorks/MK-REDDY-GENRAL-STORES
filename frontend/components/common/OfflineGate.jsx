"use client";

import { useEffect, useState } from "react";

export default function OfflineGate() {
  const [isDevOrLocalhost] = useState(() => {
    if (process.env.NODE_ENV !== "production") return true;
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  });
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isConfirmedOffline, setIsConfirmedOffline] = useState(false);

  async function verifyConnection() {
    try {
      const response = await fetch(`/api/v1/health?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      const ok = response.ok;
      setIsOnline(ok);
      setIsConfirmedOffline(!ok);
      return ok;
    } catch {
      setIsConfirmedOffline(true);
      return false;
    }
  }

  useEffect(() => {
    let offlineTimer = null;

    const setOnlineState = () => {
      setIsOnline(true);
      setIsConfirmedOffline(false);
      verifyConnection();
    };

    const setOfflineState = () => {
      setIsOnline(false);
      // Delay confirmation to avoid false negatives from transient browser/offline events.
      if (offlineTimer) clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => {
        verifyConnection();
      }, 1200);
    };

    // Initial check guards against incorrect navigator.onLine values on some browsers.
    queueMicrotask(() => {
      verifyConnection();
    });

    window.addEventListener("online", setOnlineState);
    window.addEventListener("offline", setOfflineState);

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      window.removeEventListener("online", setOnlineState);
      window.removeEventListener("offline", setOfflineState);
    };
  }, []);

  useEffect(() => {
    if (!isConfirmedOffline) return;

    const intervalId = setInterval(() => {
      verifyConnection();
    }, 8000);

    return () => clearInterval(intervalId);
  }, [isConfirmedOffline]);

  if (isDevOrLocalhost || !isConfirmedOffline) return null;

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
          onClick={() => verifyConnection()}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#16a34a] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#15803d]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

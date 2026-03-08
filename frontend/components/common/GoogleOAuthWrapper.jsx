"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";

/**
 * Patch console.error at module-init time — BEFORE GoogleOAuthProvider or
 * Google's GSI script even mounts — so every possible FedCM log is caught.
 *
 * Google's accounts.google.com/gsi/client script calls console.error with:
 *   - plain strings:   "[GSI_LOGGER]: FedCM get() rejects with ..."
 *   - Error objects:   Error { message: "[GSI_LOGGER]: FedCM ..." }
 *   - DOMException:    DOMException { message: "AbortError" }
 * We stringify every arg before matching so none slip through.
 */
if (typeof window !== "undefined" && !window.__oauthErrorPatched) {
  window.__oauthErrorPatched = true;
  const _origError = console.error.bind(console);
  console.error = (...args) => {
    const combined = args
      .map((a) => (a instanceof Error ? a.message : String(a ?? "")))
      .join(" ");
    if (
      combined.includes("[GSI_LOGGER]") ||
      combined.includes("FedCM") ||
      combined.includes("Expected static flag was missing")
    ) {
      return; // suppress Google Identity Services / FedCM noise — not a real error
    }
    _origError(...args);
  };
}

export default function GoogleOAuthWrapper({ clientId, children }) {
  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
}

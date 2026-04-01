"use client";
import { useEffect } from "react";
import {
  ArrowPathIcon as RefreshCw,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "linear-gradient(135deg, #f0f9ff 0%, #fefefe 100%)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            padding: "2.5rem 2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                background: "#2563eb",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.9rem",
                borderRadius: "0.5rem",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              MK
            </div>
            <span
              style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}
            >
              MK Reddy General Store
            </span>
          </div>
          <div
            style={{ fontSize: "6rem", lineHeight: 1, marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}
          >
            <BuildingStorefrontIcon style={{ width: "6rem", height: "6rem", color: "#16a34a" }} />
          </div>
          <div
            style={{
              display: "inline-block",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.4rem 0.9rem",
              borderRadius: 999,
              marginBottom: "1rem",
            }}
          >
            Critical Error
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#111827",
              margin: "0 0 0.75rem",
              lineHeight: 1.2,
            }}
          >
            The store is temporarily closed
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "1rem",
              lineHeight: 1.7,
              margin: "0 0 2rem",
            }}
          >
            We&apos;re experiencing an unexpected issue. Our team has been notified
            and we&apos;ll be back up shortly. Thank you for your patience!
          </p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <pre
              style={{
                background: "#1f2937",
                color: "#f87171",
                fontSize: "0.72rem",
                borderRadius: "0.75rem",
                padding: "1rem",
                textAlign: "left",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                marginBottom: "1.5rem",
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "0.85rem 2rem",
              borderRadius: "0.75rem",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(37,99,235,0.30)",
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            {}
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reload Store
          </button>
          <p
            style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#9ca3af" }}
          >
            Need help?{" "}
            <a
              href="tel:+919346586105"
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              Call us: +91 93465 86105
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}

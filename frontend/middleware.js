import { NextResponse } from "next/server";

const MAX_REQUESTS_PER_IP = 50;
const TIME_WINDOW = 60 * 60 * 1000;

const requestLogs = new Map();
const blockedIPs = new Set([
  "192.168.1.100",
  "10.0.0.50",
]);

function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown"
  );
}

export async function middleware(request) {
  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") || "unknown";

  if (blockedIPs.has(ip)) {
    console.warn(`🔴 BLOCKED IP DETECTED: ${ip}`);
    return new NextResponse(JSON.stringify({ error: "Access Denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const honeypotPaths = [
    "/admin",
    "/wp-admin",
    "/config",
    "/backup",
    "/database",
    "/.git",
    "/.env",
    "/shell.php",
    "/xmlrpc.php",
    "/api/internal",
  ];

  if (honeypotPaths.some((p) => path.startsWith(p))) {
    if (!requestLogs.has(ip)) {
      requestLogs.set(ip, []);
    }

    const logs = requestLogs.get(ip);
    const now = Date.now();

    const recentLogs = logs.filter((log) => now - log.timestamp < TIME_WINDOW);
    recentLogs.push({ timestamp: now, path, userAgent });

    requestLogs.set(ip, recentLogs);

    if (recentLogs.length > MAX_REQUESTS_PER_IP) {
      blockedIPs.add(ip);
      console.error(`🔴 IP BLOCKED: ${ip} - Too many honeypot trap requests`);
      return new NextResponse(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/wp-admin/:path*",
    "/config/:path*",
    "/backup/:path*",
    "/database/:path*",
    "/.git/:path*",
    "/.env/:path*",
    "/shell.php/:path*",
    "/xmlrpc.php/:path*",
    "/api/internal/:path*",
  ],
};

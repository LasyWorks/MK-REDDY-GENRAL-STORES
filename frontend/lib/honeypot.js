import { headers } from "next/headers";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const TRAP_LOG_FILE = join(process.cwd(), ".honeypot-log.json");

async function getTrapLogs() {
  try {
    const data = await readFile(TRAP_LOG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function logTrap(log) {
  try {
    const logs = await getTrapLogs();
    logs.push(log);
    await writeFile(TRAP_LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("Error logging trap:", error);
  }
}

export async function detectAndLogBot(path, method = "GET") {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const referer = headersList.get("referer") || "direct";

    const log = {
      timestamp: new Date().toISOString(),
      userAgent,
      ip,
      path,
      method,
      referer,
      query: {},
    };

    await logTrap(log);

    console.warn(`🔴 HONEYPOT TRAP TRIGGERED: ${path}`);
    console.warn(`User-Agent: ${userAgent}`);
    console.warn(`IP: ${ip}`);
  } catch (error) {
    console.error("Error in detectAndLogBot:", error);
  }
}

export function isSuspiciousUserAgent(userAgent) {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i,
    /perl/i,
    /ruby/i,
    /go-http-client/i,
    /ahrefs/i,
    /semrush/i,
    /mj12bot/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
}

export function isCommonBotUserAgent(userAgent) {
  const commonBots = {
    "AhrefsBot": "SEO scraper (Ahrefs)",
    "SemrushBot": "SEO scraper (Semrush)",
    "MJ12bot": "Majestic spider",
    "Googlebot": "Google bot",
    "Bingbot": "Bing bot",
    "Slurp": "Yahoo spider",
    "DuckDuckBot": "DuckDuckGo bot",
    "BaiduSpider": "Baidu spider",
    "YandexBot": "Yandex bot",
  };

  return Object.entries(commonBots).find(([key]) => userAgent.includes(key))?.[1] || null;
}

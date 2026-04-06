import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const TRAP_LOG_FILE = join(process.cwd(), ".honeypot-log.json");
const BLOCKED_IPS_FILE = join(process.cwd(), ".blocked-ips.json");

export const dynamic = "force-dynamic";

export async function GET(request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const isInternalRequest =
    !origin || origin.includes("localhost") || referer?.includes("localhost");

  if (!isInternalRequest) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const trapLogs = await readFile(TRAP_LOG_FILE, "utf-8").then((data) =>
      JSON.parse(data)
    ).catch(() => []);

    const blockedIPsData = await readFile(BLOCKED_IPS_FILE, "utf-8").then((data) =>
      JSON.parse(data)
    ).catch(() => ({}));

    const stats = {
      total_traps_triggered: trapLogs.length,
      unique_ips: new Set(trapLogs.map((log) => log.ip)).size,
      blocked_ips: Object.keys(blockedIPsData).length,
      recent_traps: trapLogs.slice(-10),
      blocked_ips_list: blockedIPsData,
      bot_types: {},
    };

    for (const log of trapLogs) {
      const userAgent = log.userAgent || "unknown";
      stats.bot_types[userAgent] = (stats.bot_types[userAgent] || 0) + 1;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error reading trap logs:", error);
    return NextResponse.json({ error: "Unable to read logs" }, { status: 500 });
  }
}

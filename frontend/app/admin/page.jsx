import { detectAndLogBot } from "@/lib/honeypot";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  await detectAndLogBot("/admin");
  redirect("/");
}

export async function POST() {
  await detectAndLogBot("/admin", "POST");
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

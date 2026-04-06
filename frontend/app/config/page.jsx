import { detectAndLogBot } from "@/lib/honeypot";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  await detectAndLogBot("/config");
  redirect("/");
}

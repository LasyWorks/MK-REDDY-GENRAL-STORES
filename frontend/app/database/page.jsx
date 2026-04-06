import { detectAndLogBot } from "@/lib/honeypot";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  await detectAndLogBot("/database");
  notFound();
}

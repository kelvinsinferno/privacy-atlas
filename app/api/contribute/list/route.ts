import { NextResponse } from "next/server";
import { listContributions } from "@/lib/db/queries";

// Live review queue — always reflect current DB state, never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const all = await listContributions();
  // Only pending + verified are shown in the review surface; rejected are dropped.
  const items = all.filter((c) => c.status !== "rejected");
  return NextResponse.json({ items });
}

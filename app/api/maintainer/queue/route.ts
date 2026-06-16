import { NextResponse } from "next/server";
import { requireMaintainer } from "@/lib/contribute/maintainer-auth";
import { listPendingForReview } from "@/lib/db/queries";

export async function GET(req: Request) {
  const auth = requireMaintainer(req);
  if ("error" in auth) return auth.error;
  const items = await listPendingForReview();
  return NextResponse.json({ items });
}

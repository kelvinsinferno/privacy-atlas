import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession } from "@/lib/contribute/session";
import { removeContribution } from "@/lib/db/queries";

function isAdmin(address: string): boolean {
  const list = (process.env.ADMIN_ADDRESSES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(address.toLowerCase());
}

export async function POST(req: Request) {
  const address = await readSession((await cookies()).get("pa_session")?.value);
  if (!address || !isAdmin(address)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { contributionId?: string; action?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { contributionId, action } = body;
  if (!contributionId || action !== "remove") return NextResponse.json({ error: "bad request" }, { status: 400 });
  await removeContribution(contributionId);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaintainer } from "@/lib/contribute/maintainer-auth";
import { setVerdict, appendAudit } from "@/lib/db/queries";

const schema = z.object({
  contributionId: z.string().trim().min(1).max(120),
  verdict: z.enum(["verify", "unverify", "reject"]),
  reason: z.string().trim().max(600).optional(),
});

export async function POST(req: Request) {
  const auth = requireMaintainer(req);
  if ("error" in auth) return auth.error;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  const { contributionId, verdict, reason } = p.data;
  await setVerdict(contributionId, { verdict, reviewer: "hermes", ...(reason ? { reason } : {}) });
  await appendAudit({ actor: "hermes", action: verdict, contributionId, detail: { verdict }, reason: reason ?? null });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaintainer } from "@/lib/contribute/maintainer-auth";
import { setReviewMeta, appendAudit } from "@/lib/db/queries";
import { httpsUrl } from "@/lib/contribute/validate";

const schema = z.object({
  contributionId: z.string().trim().min(1).max(120),
  commercial: z.boolean().optional(),
  affiliate: z.object({
    hasProgram: z.boolean().optional(),
    url: httpsUrl.optional(),
    notes: z.string().trim().max(600).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  const auth = requireMaintainer(req);
  if ("error" in auth) return auth.error;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  const { contributionId, commercial, affiliate } = p.data;
  const meta = {
    ...(commercial !== undefined ? { commercial } : {}),
    ...(affiliate ? { affiliate } : {}),
    reviewedBy: "hermes",
    reviewedAt: Date.now(),
  };
  await setReviewMeta(contributionId, meta);
  await appendAudit({ actor: "hermes", action: "review-meta", contributionId, detail: meta });
  return NextResponse.json({ ok: true });
}

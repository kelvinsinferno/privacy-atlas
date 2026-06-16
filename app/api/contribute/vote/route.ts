import { NextResponse, after } from "next/server";
import { gatedAddress } from "@/lib/contribute/auth";
import { castVote, countFlags } from "@/lib/db/queries";
import { REVIEW_THRESHOLDS } from "@/lib/contribute/reviewer";
import { dispatchHermesEvent } from "@/lib/contribute/hermes-webhook";

export async function POST(req: Request) {
  const auth = await gatedAddress();
  if ("error" in auth) return auth.error;
  let body: { contributionId?: string; vote?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { contributionId, vote } = body;
  if (!contributionId || (vote !== "confirm" && vote !== "flag")) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const counted = await castVote(contributionId, auth.address, vote);
  if (counted && vote === "flag" && (await countFlags(contributionId)) === REVIEW_THRESHOLDS.flagsToReview) {
    after(() => dispatchHermesEvent({ type: "contribution.flagged", contributionId }));
  }
  return NextResponse.json({ ok: true, counted }); // counted=false means already voted
}

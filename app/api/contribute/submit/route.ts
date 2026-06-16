import { NextResponse, after } from "next/server";
import { gatedAddress } from "@/lib/contribute/auth";
import { validatePayload } from "@/lib/contribute/validate";
import { insertContribution } from "@/lib/db/queries";
import { newEntryId } from "@/lib/community";
import { dispatchHermesEvent } from "@/lib/contribute/hermes-webhook";

export async function POST(req: Request) {
  const auth = await gatedAddress();
  if ("error" in auth) return auth.error;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const v = validatePayload(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const id = newEntryId();
  await insertContribution({ id, kind: v.kind, payload: v.value, submitter: auth.address, ts: Date.now(), removed: false });
  after(() => dispatchHermesEvent({ type: "contribution.new", contributionId: id }));
  return NextResponse.json({ id });
}

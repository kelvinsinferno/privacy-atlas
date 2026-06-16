import { NextResponse } from "next/server";
import { verifySiwe } from "@/lib/contribute/siwe";
import { issueSession } from "@/lib/contribute/session";
import { consumeNonce } from "@/lib/db/queries";

export async function POST(req: Request) {
  let body: { message?: string; signature?: string; nonce?: string };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { message, signature, nonce } = body;
  if (!message || !signature || !nonce) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  if (!(await consumeNonce(nonce))) return NextResponse.json({ error: "bad nonce" }, { status: 401 });
  const address = await verifySiwe(message, signature, nonce);
  if (!address) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const token = await issueSession(address);
  const res = NextResponse.json({ address });
  res.cookies.set("pa_session", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}

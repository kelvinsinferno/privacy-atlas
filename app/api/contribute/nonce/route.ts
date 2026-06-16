import { NextResponse } from "next/server";
import { makeNonce } from "@/lib/contribute/siwe";
import { saveNonce } from "@/lib/db/queries";

export async function POST() {
  const nonce = makeNonce();
  await saveNonce(nonce);
  return NextResponse.json({ nonce });
}

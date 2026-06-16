import { cookies } from "next/headers";
import { readSession } from "./session";
import { getGate } from "./sybil-gate";

/** Returns the gated address, or a Response to return early. */
export async function gatedAddress(): Promise<{ address: string } | { error: Response }> {
  const token = (await cookies()).get("pa_session")?.value;
  const address = await readSession(token);
  if (!address) return { error: new Response(JSON.stringify({ error: "sign in" }), { status: 401, headers: { "content-type": "application/json" } }) };
  const gate = await getGate().check(address);
  if (!gate.ok) return { error: new Response(JSON.stringify({ error: gate.reason || "not eligible" }), { status: 403, headers: { "content-type": "application/json" } }) };
  return { address };
}

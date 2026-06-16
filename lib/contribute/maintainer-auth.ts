import { timingSafeEqual } from "node:crypto";

/** Bearer-key auth for the maintainer (the Hermes agent) — a machine path separate
 *  from the wallet/SIWE admin path. Returns {ok} or an early {error: Response}. */
export function requireMaintainer(req: Request): { ok: true } | { error: Response } {
  const key = process.env.MAINTAINER_API_KEY;
  const json = (msg: string, status: number) =>
    ({ error: new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } }) });
  if (!key) return json("maintainer not configured", 503); // never fall open
  const header = req.headers.get("authorization") || "";
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return json("unauthorized", 401);
  const provided = m[1]!;
  const a = Buffer.from(provided), b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json("unauthorized", 401);
  return { ok: true };
}

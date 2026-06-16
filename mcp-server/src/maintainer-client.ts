import { timingSafeEqual } from "node:crypto";

const base = () => process.env.PA_BASE_URL || "http://localhost:3000";

export interface MaintainerResponse { ok: boolean; status: number; data: unknown; }

/** Call the Privacy Atlas maintainer REST API with the maintainer bearer key. */
export async function callMaintainer(path: string, init: { method: string; body?: unknown }): Promise<MaintainerResponse> {
  const res = await fetch(`${base()}/api/maintainer/${path}`, {
    method: init.method,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MAINTAINER_API_KEY || ""}` },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty / non-json body */ }
  return { ok: res.ok, status: res.status, data };
}

/** Bearer gate for the maintainer MCP endpoint. Fails closed when the key is unset. */
export function maintainerGate(authHeader: string | undefined): boolean {
  const key = process.env.MAINTAINER_API_KEY;
  if (!key) return false;
  const m = /^Bearer (.+)$/.exec(authHeader || "");
  if (!m) return false;
  const a = Buffer.from(m[1]!), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

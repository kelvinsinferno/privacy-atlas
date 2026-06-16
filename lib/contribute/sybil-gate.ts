export interface GateResult { ok: boolean; score?: number; reason?: string }
export interface SybilGate { check(address: string): Promise<GateResult> }

/** Dev/test gate: everyone passes. */
export class AllowGate implements SybilGate {
  async check(_address: string): Promise<GateResult> { return { ok: true }; }
}

type Fetcher = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** Gitcoin/Human Passport score gate. Fails CLOSED on error (no score → no contribute). */
export class PassportGate implements SybilGate {
  constructor(private cfg: { apiKey: string; scorerId: string; minScore: number; fetcher?: Fetcher }) {}
  async check(address: string): Promise<GateResult> {
    // Defense-in-depth: the address is interpolated into the request URL, so reject
    // anything that isn't a well-formed EVM address before it reaches the network. Fails closed.
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return { ok: false, reason: "bad address" };
    const fetcher = this.cfg.fetcher ?? (globalThis.fetch as unknown as Fetcher);
    try {
      // NOTE: verify the current Passport Scorer endpoint/shape at build time (api.passport.xyz / api.scorer.gitcoin.co).
      const url = `https://api.passport.xyz/v2/stamps/${this.cfg.scorerId}/score/${address.toLowerCase()}`;
      const res = await fetcher(url, { headers: { "X-API-KEY": this.cfg.apiKey } });
      if (!res.ok) return { ok: false, reason: "passport unavailable" };
      const body = (await res.json()) as { score?: string | number };
      const score = typeof body.score === "string" ? parseFloat(body.score) : (body.score ?? 0);
      return { ok: score >= this.cfg.minScore, score, reason: score >= this.cfg.minScore ? undefined : "score too low" };
    } catch {
      return { ok: false, reason: "passport error" };
    }
  }
}

/** Select the gate from env. Defaults to AllowGate (dev/test). */
export function getGate(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): SybilGate {
  if (env.SYBIL_GATE === "passport") {
    return new PassportGate({
      apiKey: env.PASSPORT_API_KEY ?? "",
      scorerId: env.PASSPORT_SCORER_ID ?? "",
      minScore: Number(env.PASSPORT_MIN_SCORE ?? "15"),
    });
  }
  return new AllowGate();
}

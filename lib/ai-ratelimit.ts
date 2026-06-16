/**
 * AI proxy rate-limit helper — wraps @vercel/firewall's checkRateLimit.
 *
 * TWO checks per request:
 *   1. Per-client IP ("ai-per-ip")       — short window, per user
 *   2. Global burst limiter ("ai-global-burst") — burst-spike circuit-breaker
 *
 * NOTE ON "GLOBAL BURST" VS "DAILY CAP":
 * Vercel Firewall windows max at 10 minutes (Hobby/Pro) or 1 hour (Enterprise).
 * There is NO 24-hour window, so this rule is a burst limiter, not a true daily
 * cap. For a real daily/monthly spend ceiling, set a spend limit on your xAI
 * account (console.x.ai → Billing → Spend limits). See docs/DEPLOY-AI-GUARDRAILS.md.
 *
 * GRACEFUL NO-OP (the #1 constraint):
 * @vercel/firewall returns { rateLimited: false } when NODE_ENV !== "production"
 * (local dev, CI, test suite) — this is the SDK's built-in behavior.
 * We also wrap each call in try/catch so any unexpected error is treated as
 * NOT limited. Result: local dev + tests + build are NEVER affected.
 *
 * The numeric limits and windows are configured as Vercel Firewall rules in
 * the dashboard (see docs/DEPLOY-AI-GUARDRAILS.md). Only the rule IDs live
 * here, so limits are tunable without a redeploy.
 */
import { checkRateLimit } from "@vercel/firewall";
import type { NextRequest } from "next/server";

/** Rule IDs — must match the names you give the rules in the Vercel dashboard. */
const PER_IP_RULE_ID = "ai-per-ip";
const GLOBAL_BURST_RULE_ID = "ai-global-burst";

export interface RateLimitResult {
  limited: boolean;
  reason?: "client" | "global";
}

/**
 * Returns { limited: false } in all non-Vercel environments (local dev / CI /
 * tests / preview without firewall). In production on Vercel, enforces the two
 * configured dashboard rules.
 *
 * NEVER logs IPs or request content.
 */
export async function checkAiRateLimit(
  req: NextRequest
): Promise<RateLimitResult> {
  // ── Per-IP check ──────────────────────────────────────────────────────────
  try {
    // rateLimitKey: first value of x-forwarded-for (set by Vercel's edge).
    // Falls back to "unknown" so the helper never throws on a missing header.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { rateLimited } = await checkRateLimit(PER_IP_RULE_ID, {
      request: req,
      rateLimitKey: ip,
    });
    if (rateLimited) return { limited: true, reason: "client" };
  } catch {
    // Not on Vercel or rule not yet configured — allow.
  }

  // ── Global burst limiter ──────────────────────────────────────────────────
  try {
    const { rateLimited } = await checkRateLimit(GLOBAL_BURST_RULE_ID, {
      request: req,
      rateLimitKey: "global-burst",
    });
    if (rateLimited) return { limited: true, reason: "global" };
  } catch {
    // Not on Vercel or rule not yet configured — allow.
  }

  return { limited: false };
}

import { createHmac, randomUUID } from "node:crypto";

export interface HermesEvent {
  type: "contribution.new" | "contribution.flagged";
  contributionId: string;
}

/** Fire a signed, fire-and-forget event to wake Hermes. No-op if HERMES_WEBHOOK_URL is
 *  unset; errors are swallowed — Hermes polls /api/maintainer/queue as a backstop. The
 *  receiver verifies the HMAC (over the raw body) + the timestamp/delivery id for replay. */
export async function dispatchHermesEvent(event: HermesEvent): Promise<void> {
  const url = process.env.HERMES_WEBHOOK_URL;
  const secret = process.env.HERMES_WEBHOOK_SECRET;
  if (!url || !secret) return; // fail closed: never send unsigned-equivalent events
  const ts = Date.now();
  const deliveryId = randomUUID();
  const body = JSON.stringify({ type: event.type, contributionId: event.contributionId, ts, deliveryId });
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Hermes's generic webhook adapter validates GitHub-style HMAC
        // signatures, so send the canonical header it already accepts.
        "x-hub-signature-256": `sha256=${sig}`,
        // Keep the Atlas-specific headers for audit/debugging and future
        // custom receivers. The body HMAC is the same value.
        "x-pa-signature": `sha256=${sig}`,
        "x-pa-timestamp": String(ts),
        "x-pa-delivery": deliveryId,
        "x-request-id": deliveryId,
      },
      body,
    });
  } catch { /* fire-and-forget; the queue poll is the backstop */ }
}

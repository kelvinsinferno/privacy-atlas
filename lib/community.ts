/**
 * lib/community.ts — Single source of truth for community review thresholds.
 *
 * (HANDOFF: hidden, variable per entry) Both the model merge (lib/model.ts) and
 * the review UI (_review.tsx) MUST use this so the graph and UI never disagree
 * on "verified".
 *
 * Thresholds are deliberately UNDISCLOSED and VARIABLE per entry: each submission
 * gets its own promotion/rejection bar derived from its id, in a range high enough
 * that small brigades fail. Users only ever see "in review" — never the bar, never
 * the counts. Keeps bad actors guessing.
 */

/** Deterministic hash of a string → non-negative 32-bit int. */
export function _h(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Promotion / rejection bar derived from the entry id (keeps bad actors guessing).
 *  promote: 9–16, reject: 5–8 (never shown to users). */
export function _bars(e: { id?: string; ts?: number }): { promote: number; reject: number } {
  const h = _h(String(e.id || e.ts || "x"));
  return { promote: 9 + (h % 8), reject: 5 + ((h >> 4) % 4) };
}

/** Main API: "verified" | "rejected" | "pending" for any community entry.
 *  verified  = confirms >= promote AND confirms >= flags * 3 (strong consensus)
 *  rejected  = flags >= reject AND flags >= confirms (disputes fail closed)
 *  pending   = everything else */
export function entryStatus(e: {
  id?: string;
  ts?: number;
  confirms?: number;
  flags?: number;
}): "verified" | "rejected" | "pending" {
  const t = _bars(e), c = e.confirms || 0, f = e.flags || 0;
  if (f >= t.reject && f >= c) return "rejected";    // disputes fail closed
  if (c >= t.promote && c >= f * 3) return "verified"; // strong consensus required
  return "pending";
}

/** Generate a new unique entry id for community submissions. */
export function newEntryId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

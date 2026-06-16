import { randomUUID } from "node:crypto";
import { eq, sql, and } from "drizzle-orm";
import { db } from "./client";
import { contributions, votes, nonces, maintainerAudit } from "./schema";
import type { ContributionRecord, ContributionWithStatus, ContributionKind, ContributionPayload, ProposedNodePayload, HowtoPayload, ResourcePayload, SourcePayload, ReviewBadge, ReviewMeta } from "@/lib/contribute/types";
import type { ReviewVerdict } from "@/lib/contribute/reviewer";
import { REVIEW_THRESHOLDS } from "@/lib/contribute/reviewer";
import { statusFor } from "@/lib/contribute/status";

export async function saveNonce(nonce: string): Promise<void> {
  await db().insert(nonces).values({ nonce });
}

/** Consume a nonce (returns true if it existed + was deleted). Single-use. */
export async function consumeNonce(nonce: string): Promise<boolean> {
  const rows = await db().delete(nonces).where(eq(nonces.nonce, nonce)).returning();
  return rows.length > 0;
}

export async function insertContribution(rec: ContributionRecord): Promise<void> {
  await db().insert(contributions).values({
    id: rec.id,
    kind: rec.kind,
    payload: rec.payload,
    submitter: rec.submitter,
    ts: rec.ts,
    removed: rec.removed,
  });
}

/** Upsert a vote; the unique index enforces one vote per wallet per entry. Returns false if already voted. */
export async function castVote(
  contributionId: string,
  voter: string,
  vote: "confirm" | "flag"
): Promise<boolean> {
  const res = await db()
    .insert(votes)
    .values({ contributionId, voter: voter.toLowerCase(), vote })
    .onConflictDoNothing({ target: [votes.contributionId, votes.voter] })
    .returning();
  return res.length > 0;
}

/** Number of 'flag' votes on a contribution (used to detect the review threshold crossing). */
export async function countFlags(contributionId: string): Promise<number> {
  const rows = await db().select({ n: sql<number>`count(*)` }).from(votes)
    .where(and(eq(votes.contributionId, contributionId), eq(votes.vote, "flag")));
  return Number(rows[0]?.n ?? 0);
}

export async function removeContribution(id: string): Promise<void> {
  await db().update(contributions).set({ removed: true }).where(eq(contributions.id, id));
}

/** Apply a maintainer/agent verdict. "verify" grants the badge; "unverify" pulls
 *  it back to "none" but keeps the entry live; "reject" removes the contribution;
 *  "skip" is a no-op. Records who/why/when for the audit trail. */
export async function setVerdict(id: string, v: ReviewVerdict): Promise<void> {
  if (v.verdict === "skip") return;
  const audit = { reviewedBy: v.reviewer, reviewedAt: new Date(), reviewReason: v.reason ?? null };
  if (v.verdict === "reject") {
    await db().update(contributions).set({ removed: true, ...audit }).where(eq(contributions.id, id));
    return;
  }
  // "verify" grants the badge; "unverify" revokes it (entry stays visible).
  await db().update(contributions)
    .set({ badge: v.verdict === "verify" ? "verified" : "none", ...audit })
    .where(eq(contributions.id, id));
}

/** Bulk-insert built-in nodes as already-verified seed contributions.
 *  Idempotent: existing ids (and their accumulated votes) are left untouched. */
export async function seedContributions(
  rows: Array<{ id: string; payload: ProposedNodePayload }>
): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await db().insert(contributions).values(
    rows.map((r) => ({
      id: r.id, kind: "node", payload: r.payload, submitter: "seed", ts: Date.now(),
      removed: false, badge: "verified", reviewedBy: "seed", reviewReason: "built-in seed content",
    }))
  ).onConflictDoNothing({ target: contributions.id }).returning();
  return res.length;
}

/** Bulk-insert built-in how-tos as already-verified seed contributions.
 *  Idempotent: existing ids (and their accumulated votes) are left untouched. */
export async function seedHowtos(rows: Array<{ id: string; payload: HowtoPayload }>): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await db().insert(contributions).values(
    rows.map((r) => ({
      id: r.id, kind: "howto", payload: r.payload, submitter: "seed", ts: Date.now(),
      removed: false, badge: "verified", reviewedBy: "seed", reviewReason: "built-in seed content",
    }))
  ).onConflictDoNothing({ target: contributions.id }).returning();
  return res.length;
}

/** Bulk-insert built-in resources as already-verified seed contributions.
 *  Idempotent: existing ids (and their accumulated votes) are left untouched. */
export async function seedResources(rows: Array<{ id: string; payload: ResourcePayload }>): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await db().insert(contributions).values(
    rows.map((r) => ({
      id: r.id, kind: "resource", payload: r.payload, submitter: "seed", ts: Date.now(),
      removed: false, badge: "verified", reviewedBy: "seed", reviewReason: "built-in seed content",
    }))
  ).onConflictDoNothing({ target: contributions.id }).returning();
  return res.length;
}

/** Bulk-insert built-in node/threat citations as already-verified seed contributions.
 *  Idempotent: existing ids (and their accumulated votes) are left untouched. */
export async function seedSources(rows: Array<{ id: string; payload: SourcePayload }>): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await db().insert(contributions).values(
    rows.map((r) => ({
      id: r.id, kind: "source", payload: r.payload, submitter: "seed", ts: Date.now(),
      removed: false, badge: "verified", reviewedBy: "seed", reviewReason: "built-in seed content",
    }))
  ).onConflictDoNothing({ target: contributions.id }).returning();
  return res.length;
}

/** Ids of contributions the maintainer/AI removed (reject verdict). The bake
 *  prunes these from graph.json. */
export async function listRemovedIds(): Promise<string[]> {
  const rows = await db().select({ id: contributions.id }).from(contributions).where(eq(contributions.removed, true));
  return rows.map((r) => r.id);
}

/** All non-removed contributions with live tallies + computed status. */
export async function listContributions(): Promise<ContributionWithStatus[]> {
  const rows = await db()
    .select({
      id: contributions.id,
      kind: contributions.kind,
      payload: contributions.payload,
      ts: contributions.ts,
      badge: contributions.badge,
      reviewedBy: contributions.reviewedBy,
      reviewedAt: contributions.reviewedAt,
      reviewReason: contributions.reviewReason,
      reviewMeta: contributions.reviewMeta,
      confirms: sql<number>`count(*) filter (where ${votes.vote} = 'confirm')`,
      flags: sql<number>`count(*) filter (where ${votes.vote} = 'flag')`,
    })
    .from(contributions)
    .leftJoin(votes, eq(votes.contributionId, contributions.id))
    .where(eq(contributions.removed, false))
    .groupBy(
      contributions.id, contributions.kind, contributions.payload, contributions.ts,
      contributions.badge, contributions.reviewedBy, contributions.reviewedAt, contributions.reviewReason,
      contributions.reviewMeta
    );
  return rows.map((r) => {
    const confirms = Number(r.confirms ?? 0);
    const flags = Number(r.flags ?? 0);
    return {
      id: r.id,
      kind: ((["howto", "resource", "source", "region"] as const).includes(r.kind as "howto" | "resource" | "source" | "region") ? r.kind : "node") as ContributionKind,
      payload: r.payload as ContributionPayload,
      ts: Number(r.ts),
      confirms,
      flags,
      status: statusFor(r.id, confirms, flags),
      badge: (r.badge === "verified" ? "verified" : "none") as ReviewBadge,
      reviewedBy: r.reviewedBy ?? null,
      reviewedAt: r.reviewedAt ? r.reviewedAt.getTime() : null,
      reviewReason: r.reviewReason ?? null,
      reviewMeta: (r.reviewMeta as ReviewMeta | null) ?? null,
    };
  });
}

/** Attach AI/maintainer review metadata (commercial/affiliate). AI-owned — not called by /submit. */
export async function setReviewMeta(id: string, meta: ReviewMeta): Promise<void> {
  await db().update(contributions).set({ reviewMeta: meta }).where(eq(contributions.id, id));
}

/** A contribution needs a maintainer's eye when it's unbadged (verify candidate)
 *  or has crossed the downvote-flag threshold (reject / re-review candidate). */
export function isPendingForReview(c: ContributionWithStatus): boolean {
  return c.badge === "none" || c.flags >= REVIEW_THRESHOLDS.flagsToReview;
}

/** The maintainer review queue — pending-review contributions with full payload + tallies. */
export async function listPendingForReview(): Promise<ContributionWithStatus[]> {
  return (await listContributions()).filter(isPendingForReview);
}

export interface AuditEntry {
  actor: string;
  action: "verify" | "unverify" | "reject" | "review-meta";
  contributionId: string;
  detail?: unknown;
  reason?: string | null;
}

/** Append an immutable maintainer-action record. Called inside every maintainer mutation. */
export async function appendAudit(e: AuditEntry): Promise<void> {
  await db().insert(maintainerAudit).values({
    id: randomUUID(),
    actor: e.actor,
    action: e.action,
    contributionId: e.contributionId,
    detail: (e.detail ?? null) as object | null,
    reason: e.reason ?? null,
  });
}

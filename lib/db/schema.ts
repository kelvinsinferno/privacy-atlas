import { pgTable, text, boolean, bigint, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const contributions = pgTable("contributions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("node"),
  payload: jsonb("payload").notNull(),
  submitter: text("submitter").notNull(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  removed: boolean("removed").notNull().default(false),
  // AI-maintainer review fields (granted by the reviewer agent; null/none until then)
  badge: text("badge").notNull().default("none"), // "none" | "verified"
  reviewedBy: text("reviewed_by"),                  // e.g. "ai:grok-4.3"
  reviewedAt: timestamp("reviewed_at"),
  reviewReason: text("review_reason"),
  reviewMeta: jsonb("review_meta"),   // AI/maintainer-owned commercial/affiliate metadata; nullable
});

export const votes = pgTable(
  "votes",
  {
    contributionId: text("contribution_id").notNull(),
    voter: text("voter").notNull(),
    vote: text("vote").notNull(), // "confirm" | "flag"
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    oneVotePerWallet: uniqueIndex("one_vote_per_wallet").on(t.contributionId, t.voter),
    byContribution: index("votes_by_contribution").on(t.contributionId),
  })
);

export const nonces = pgTable("nonces", {
  nonce: text("nonce").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const maintainerAudit = pgTable("maintainer_audit", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  contributionId: text("contribution_id").notNull(),
  detail: jsonb("detail"),
  reason: text("reason"),
  ts: timestamp("ts").notNull().defaultNow(),
});

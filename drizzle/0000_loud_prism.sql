CREATE TABLE "contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'node' NOT NULL,
	"payload" jsonb NOT NULL,
	"submitter" text NOT NULL,
	"ts" bigint NOT NULL,
	"removed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"contribution_id" text NOT NULL,
	"voter" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "one_vote_per_wallet" ON "votes" USING btree ("contribution_id","voter");--> statement-breakpoint
CREATE INDEX "votes_by_contribution" ON "votes" USING btree ("contribution_id");
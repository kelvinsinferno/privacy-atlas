ALTER TABLE "contributions" ADD COLUMN "badge" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "review_reason" text;
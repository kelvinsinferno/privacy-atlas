CREATE TABLE "maintainer_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"contribution_id" text NOT NULL,
	"detail" jsonb,
	"reason" text,
	"ts" timestamp DEFAULT now() NOT NULL
);

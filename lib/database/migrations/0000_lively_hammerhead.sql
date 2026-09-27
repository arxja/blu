CREATE TABLE "events" (
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"user_id" text,
	"anonymous_id" text,
	"group_id" text,
	"timestamp" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "events_tenant_id_event_id_pk" PRIMARY KEY("tenant_id","event_id")
);
--> statement-breakpoint
CREATE INDEX "idx_events_tenant_timestamp" ON "events" USING btree ("tenant_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_events_tenant_event_name" ON "events" USING btree ("tenant_id","event_name");--> statement-breakpoint
CREATE INDEX "idx_events_tenant_user" ON "events" USING btree ("tenant_id","user_id");
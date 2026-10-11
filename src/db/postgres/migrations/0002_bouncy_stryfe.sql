ALTER TABLE "user" ADD COLUMN "google_calendar_sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Event" ADD COLUMN "google_event_id" text;
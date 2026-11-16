CREATE TABLE "event_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"color" varchar(30) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "event_tags_shop_slug_idx" ON "event_tags" USING btree ("shop_id","slug");--> statement-breakpoint
CREATE INDEX "event_tags_shop_idx" ON "event_tags" USING btree ("shop_id");
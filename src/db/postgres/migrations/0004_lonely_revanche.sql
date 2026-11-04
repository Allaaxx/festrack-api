CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "shop_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "shop_role" DEFAULT 'MEMBER' NOT NULL,
	"token" text NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp (3) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "shop_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "shop_invitations" ADD CONSTRAINT "shop_invitations_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "shop_invitations_token_idx" ON "shop_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "shop_invitations_shop_idx" ON "shop_invitations" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shop_invitations_email_idx" ON "shop_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "shop_invitations_shop_email_idx" ON "shop_invitations" USING btree ("shop_id","email");
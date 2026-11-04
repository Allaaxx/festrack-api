ALTER TABLE "Event" DROP CONSTRAINT "Event_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "Event" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Transaction" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Event" ADD CONSTRAINT "Event_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
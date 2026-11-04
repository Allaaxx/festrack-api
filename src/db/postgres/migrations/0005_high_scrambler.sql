ALTER TABLE "Event" RENAME COLUMN "user_id" TO "created_by_user_id";--> statement-breakpoint
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "Event" ADD COLUMN "shop_id" text;--> statement-breakpoint
DO $$
DECLARE
    r RECORD;
    target_shop_id text;
BEGIN
    FOR r IN SELECT DISTINCT created_by_user_id FROM "Event" WHERE shop_id IS NULL LOOP
        SELECT sm.shop_id INTO target_shop_id
        FROM "shop_members" sm
        WHERE sm.user_id = r.created_by_user_id AND sm.role = 'OWNER'
        LIMIT 1;

        IF target_shop_id IS NULL THEN
            target_shop_id := gen_random_uuid()::text;
            INSERT INTO "shops" ("id", "name", "description", "created_at", "updated_at")
            VALUES (target_shop_id, 'Default Shop', 'Automatically created shop for existing events', now(), now());

            INSERT INTO "shop_members" ("id", "shop_id", "user_id", "role", "created_at", "updated_at")
            VALUES (gen_random_uuid()::text, target_shop_id, r.created_by_user_id, 'OWNER', now(), now());
        END IF;

        UPDATE "Event" SET "shop_id" = target_shop_id WHERE "created_by_user_id" = r.created_by_user_id AND "shop_id" IS NULL;
    END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "Event" ALTER COLUMN "shop_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Event" ADD CONSTRAINT "Event_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Event" ADD CONSTRAINT "Event_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;

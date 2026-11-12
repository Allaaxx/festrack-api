ALTER TABLE "products" DROP CONSTRAINT "products_slug_unique";--> statement-breakpoint
DROP INDEX "products_slug_idx";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_shop_slug_idx" ON "products" USING btree ("shop_id","slug");
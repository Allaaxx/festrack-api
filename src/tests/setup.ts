import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { beforeAll, beforeEach, afterAll, jest } from 'bun:test';
import { sqlClient } from '../db/postgres/index.js';

globalThis.jest = jest;

beforeAll(async () => {
    try {
        await sqlClient.unsafe(`
            ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
            ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_slug_unique";
            DROP INDEX IF EXISTS "products_slug_unique";
            DROP INDEX IF EXISTS "products_slug_idx";
            CREATE UNIQUE INDEX IF NOT EXISTS "products_shop_slug_idx" ON "products" ("shop_id", "slug");
        `);
    } catch {
        // Safe fallback if database is not reachable or tables do not exist
    }
});

beforeEach(async () => {
    try {
        await sqlClient.unsafe(
            'TRUNCATE TABLE "stock_movements", "bundle_items", "stock", "products", "Transaction", "Event", "shops", "shop_members", "session", "account", "verification", "user" CASCADE;',
        );
    } catch {
        try {
            await sqlClient.unsafe(
                'TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;',
            );
        } catch {
            // Safe fallback if database is not reachable or tables do not exist
        }
    }
});

afterAll(async () => {
    try {
        await sqlClient.end();
    } catch {
        // Safe fallback
    }
});

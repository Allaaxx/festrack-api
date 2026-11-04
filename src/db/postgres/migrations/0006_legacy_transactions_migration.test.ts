import { describe, it, expect } from 'bun:test';
import { sqlClient } from '../index.js';

describe('Legacy Transactions Migration (0006)', () => {
    it('should automatically provision a default shop and assign user as OWNER for legacy transactions without shop_id', async () => {
        // Create legacy user
        const userId = crypto.randomUUID();
        await sqlClient.unsafe(`
            INSERT INTO "user" ("id", "name", "email", "email_verified", "first_name", "last_name", "created_at", "updated_at")
            VALUES ('${userId}', 'Legacy Tx User', 'legacy_tx@test.com', true, 'Legacy', 'User', now(), now());
        `);

        // Temporarily allow NULL shop_id to simulate legacy data before migration
        await sqlClient.unsafe(
            'ALTER TABLE "Transaction" ALTER COLUMN "shop_id" DROP NOT NULL;',
        );

        const txId = crypto.randomUUID();
        await sqlClient.unsafe(`
            INSERT INTO "Transaction" ("id", "name", "date", "amount", "type", "created_by_user_id", "shop_id")
            VALUES ('${txId}', 'Legacy Transaction', '2026-05-01', '150.00', 'EXPENSE', '${userId}', NULL);
        `);

        // Run the backfill DO block from migration 0006
        await sqlClient.unsafe(`
            DO $$
            DECLARE
                r RECORD;
                target_shop_id text;
            BEGIN
                FOR r IN SELECT DISTINCT created_by_user_id FROM "Transaction" WHERE shop_id IS NULL LOOP
                    SELECT sm.shop_id INTO target_shop_id
                    FROM "shop_members" sm
                    WHERE sm.user_id = r.created_by_user_id AND sm.role = 'OWNER'
                    LIMIT 1;

                    IF target_shop_id IS NULL THEN
                        target_shop_id := gen_random_uuid()::text;
                        INSERT INTO "shops" ("id", "name", "description", "created_at", "updated_at")
                        VALUES (target_shop_id, 'Default Shop', 'Automatically created shop for existing transactions', now(), now());

                        INSERT INTO "shop_members" ("id", "shop_id", "user_id", "role", "created_at", "updated_at")
                        VALUES (gen_random_uuid()::text, target_shop_id, r.created_by_user_id, 'OWNER', now(), now());
                    END IF;

                    UPDATE "Transaction" SET "shop_id" = target_shop_id WHERE "created_by_user_id" = r.created_by_user_id AND "shop_id" IS NULL;
                END LOOP;
            END $$;
        `);

        // Verify shop was created
        const [memberRecord] = await sqlClient.unsafe(`
            SELECT sm.shop_id, sm.role, s.name as shop_name
            FROM "shop_members" sm
            JOIN "shops" s ON s.id = sm.shop_id
            WHERE sm.user_id = '${userId}';
        `);

        expect(memberRecord).toBeDefined();
        expect(memberRecord.role).toBe('OWNER');
        expect(memberRecord.shop_name).toBe('Default Shop');

        // Verify transaction now points to the created shop
        const [migratedTx] = await sqlClient.unsafe(`
            SELECT id, shop_id, created_by_user_id
            FROM "Transaction"
            WHERE id = '${txId}';
        `);

        expect(migratedTx.shop_id).toBe(memberRecord.shop_id);
        expect(migratedTx.created_by_user_id).toBe(userId);

        // Restore NOT NULL constraint
        await sqlClient.unsafe(
            'ALTER TABLE "Transaction" ALTER COLUMN "shop_id" SET NOT NULL;',
        );
    });
});

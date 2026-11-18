import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'bun:test';
import { inArray } from 'drizzle-orm';
import { db, sqlClient } from '../index.js';
import { eventsTable, shopsTable, usersTable } from '../schemas/index.js';
import { shop, user } from '../../../tests/index.js';

const MIGRATION_PATH = resolve(
    import.meta.dir,
    '0017_backfill_all_day_events.sql',
);
const JOURNAL_PATH = resolve(import.meta.dir, 'meta/_journal.json');

async function executeBackfillMigration(): Promise<void> {
    const sqlContent = readFileSync(MIGRATION_PATH, 'utf8');
    const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

    expect(statements.length).toBeGreaterThan(0);

    for (const statement of statements) {
        await sqlClient.unsafe(statement);
    }
}

describe('Backfill All-Day Events Migration (0017)', () => {
    beforeEach(async () => {
        await db.insert(usersTable).values(user);
        await db.insert(shopsTable).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    it('should register 0017_backfill_all_day_events in Drizzle _journal.json after 0016_mushy_chronomancer', () => {
        const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as {
            entries: Array<{ idx: number; tag: string }>;
        };
        const prevIdx = journal.entries.findIndex(
            (entry) => entry.tag === '0016_mushy_chronomancer',
        );
        const currentEntry = journal.entries[prevIdx + 1];

        expect(prevIdx).toBeGreaterThanOrEqual(0);
        expect(currentEntry).toBeDefined();
        expect(currentEntry.tag).toBe('0017_backfill_all_day_events');
        expect(currentEntry.idx).toBe(17);
    });

    it('should mark legacy UTC all-day rows (00:00:00Z to 23:59:xxZ) as all_day = true without shifting dates', async () => {
        const singleDayId = crypto.randomUUID();
        const multiDayZeroSecId = crypto.randomUUID();
        const multiDayMsId = crypto.randomUUID();

        await db.insert(eventsTable).values([
            {
                id: singleDayId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Legacy Single Day',
                start_date: new Date('2026-08-10T00:00:00.000Z'),
                end_date: new Date('2026-08-10T23:59:59.000Z'),
                all_day: false,
            },
            {
                id: multiDayZeroSecId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Legacy Multi Day :00',
                start_date: new Date('2026-08-12T00:00:00.000Z'),
                end_date: new Date('2026-08-14T23:59:00.000Z'),
                all_day: false,
            },
            {
                id: multiDayMsId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Legacy Multi Day .999',
                start_date: new Date('2026-09-01T00:00:00.000Z'),
                end_date: new Date('2026-09-03T23:59:59.999Z'),
                all_day: false,
            },
        ]);

        await executeBackfillMigration();

        const rows = await db
            .select()
            .from(eventsTable)
            .where(
                inArray(eventsTable.id, [
                    singleDayId,
                    multiDayZeroSecId,
                    multiDayMsId,
                ]),
            );
        const byId = new Map(rows.map((row) => [row.id, row]));

        expect(byId.get(singleDayId)?.all_day).toBe(true);
        expect(byId.get(singleDayId)?.start_date.toISOString()).toBe(
            '2026-08-10T00:00:00.000Z',
        );
        expect(byId.get(singleDayId)?.end_date.toISOString()).toBe(
            '2026-08-10T23:59:59.000Z',
        );

        expect(byId.get(multiDayZeroSecId)?.all_day).toBe(true);
        expect(byId.get(multiDayZeroSecId)?.start_date.toISOString()).toBe(
            '2026-08-12T00:00:00.000Z',
        );
        expect(byId.get(multiDayZeroSecId)?.end_date.toISOString()).toBe(
            '2026-08-14T23:59:00.000Z',
        );

        expect(byId.get(multiDayMsId)?.all_day).toBe(true);
        expect(byId.get(multiDayMsId)?.start_date.toISOString()).toBe(
            '2026-09-01T00:00:00.000Z',
        );
        expect(byId.get(multiDayMsId)?.end_date.toISOString()).toBe(
            '2026-09-03T23:59:59.999Z',
        );
    });

    it('should mark shifted -03:00 rows (03:00:00Z to 02:59:xxZ) as all_day = true and normalize bounds to civil UTC 00:00:00Z–23:59:59Z', async () => {
        const singleDayId = crypto.randomUUID();
        const multiDayId = crypto.randomUUID();
        const yearRolloverId = crypto.randomUUID();

        await db.insert(eventsTable).values([
            {
                id: singleDayId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Shifted Single Day',
                start_date: new Date('2026-11-18T03:00:00.000Z'),
                end_date: new Date('2026-11-19T02:59:59.000Z'),
                all_day: false,
            },
            {
                id: multiDayId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Shifted Multi Day',
                start_date: new Date('2026-11-18T03:00:00.000Z'),
                end_date: new Date('2026-11-20T02:59:59.999Z'),
                all_day: false,
            },
            {
                id: yearRolloverId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Shifted Year Rollover',
                start_date: new Date('2026-12-31T03:00:00.000Z'),
                end_date: new Date('2027-01-01T02:59:00.000Z'),
                all_day: false,
            },
        ]);

        await executeBackfillMigration();

        const rows = await db
            .select()
            .from(eventsTable)
            .where(
                inArray(eventsTable.id, [
                    singleDayId,
                    multiDayId,
                    yearRolloverId,
                ]),
            );
        const byId = new Map(rows.map((row) => [row.id, row]));

        expect(byId.get(singleDayId)?.all_day).toBe(true);
        expect(byId.get(singleDayId)?.start_date.toISOString()).toBe(
            '2026-11-18T00:00:00.000Z',
        );
        expect(byId.get(singleDayId)?.end_date.toISOString()).toBe(
            '2026-11-18T23:59:59.000Z',
        );

        expect(byId.get(multiDayId)?.all_day).toBe(true);
        expect(byId.get(multiDayId)?.start_date.toISOString()).toBe(
            '2026-11-18T00:00:00.000Z',
        );
        expect(byId.get(multiDayId)?.end_date.toISOString()).toBe(
            '2026-11-19T23:59:59.000Z',
        );

        expect(byId.get(yearRolloverId)?.all_day).toBe(true);
        expect(byId.get(yearRolloverId)?.start_date.toISOString()).toBe(
            '2026-12-31T00:00:00.000Z',
        );
        expect(byId.get(yearRolloverId)?.end_date.toISOString()).toBe(
            '2026-12-31T23:59:59.000Z',
        );
    });

    it('should leave non-matching Timed Events and already all_day = true rows untouched and be idempotent', async () => {
        const regularTimedId = crypto.randomUUID();
        const partialUtcStartId = crypto.randomUUID();
        const partialShiftedStartId = crypto.randomUUID();
        const partialUtcEndId = crypto.randomUUID();
        const partialShiftedEndId = crypto.randomUUID();
        const alreadyAllDayId = crypto.randomUUID();
        const alreadyAllDayGuardId = crypto.randomUUID();

        await db.insert(eventsTable).values([
            {
                id: regularTimedId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Regular Timed Event',
                start_date: new Date('2026-11-18T14:00:00.000Z'),
                end_date: new Date('2026-11-18T17:30:00.000Z'),
                all_day: false,
            },
            {
                id: partialUtcStartId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Timed 00:00 to 12:00',
                start_date: new Date('2026-11-18T00:00:00.000Z'),
                end_date: new Date('2026-11-18T12:00:00.000Z'),
                all_day: false,
            },
            {
                id: partialShiftedStartId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Timed 03:00 to 05:00',
                start_date: new Date('2026-11-18T03:00:00.000Z'),
                end_date: new Date('2026-11-18T05:00:00.000Z'),
                all_day: false,
            },
            {
                id: partialUtcEndId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Timed 10:00 to 23:59',
                start_date: new Date('2026-11-18T10:00:00.000Z'),
                end_date: new Date('2026-11-18T23:59:59.000Z'),
                all_day: false,
            },
            {
                id: partialShiftedEndId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Timed 04:00 to 02:59',
                start_date: new Date('2026-11-18T04:00:00.000Z'),
                end_date: new Date('2026-11-19T02:59:59.000Z'),
                all_day: false,
            },
            {
                id: alreadyAllDayId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Already All Day',
                start_date: new Date('2026-11-25T00:00:00.000Z'),
                end_date: new Date('2026-11-25T23:59:59.000Z'),
                all_day: true,
            },
            {
                id: alreadyAllDayGuardId,
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Already All Day Guard',
                start_date: new Date('2026-11-26T03:00:00.000Z'),
                end_date: new Date('2026-11-27T02:59:59.000Z'),
                all_day: true,
            },
        ]);

        await executeBackfillMigration();
        // Run a second time to verify idempotency
        await executeBackfillMigration();

        const rows = await db
            .select()
            .from(eventsTable)
            .where(
                inArray(eventsTable.id, [
                    regularTimedId,
                    partialUtcStartId,
                    partialShiftedStartId,
                    partialUtcEndId,
                    partialShiftedEndId,
                    alreadyAllDayId,
                    alreadyAllDayGuardId,
                ]),
            );
        const byId = new Map(rows.map((row) => [row.id, row]));

        for (const id of [
            regularTimedId,
            partialUtcStartId,
            partialShiftedStartId,
            partialUtcEndId,
            partialShiftedEndId,
        ]) {
            expect(byId.get(id)?.all_day).toBe(false);
        }

        expect(byId.get(regularTimedId)?.start_date.toISOString()).toBe(
            '2026-11-18T14:00:00.000Z',
        );
        expect(byId.get(regularTimedId)?.end_date.toISOString()).toBe(
            '2026-11-18T17:30:00.000Z',
        );
        expect(byId.get(partialUtcStartId)?.end_date.toISOString()).toBe(
            '2026-11-18T12:00:00.000Z',
        );
        expect(byId.get(partialShiftedStartId)?.end_date.toISOString()).toBe(
            '2026-11-18T05:00:00.000Z',
        );
        expect(byId.get(partialUtcEndId)?.start_date.toISOString()).toBe(
            '2026-11-18T10:00:00.000Z',
        );
        expect(byId.get(partialShiftedEndId)?.start_date.toISOString()).toBe(
            '2026-11-18T04:00:00.000Z',
        );

        expect(byId.get(alreadyAllDayId)?.all_day).toBe(true);
        expect(byId.get(alreadyAllDayId)?.start_date.toISOString()).toBe(
            '2026-11-25T00:00:00.000Z',
        );
        expect(byId.get(alreadyAllDayId)?.end_date.toISOString()).toBe(
            '2026-11-25T23:59:59.000Z',
        );

        expect(byId.get(alreadyAllDayGuardId)?.all_day).toBe(true);
        expect(byId.get(alreadyAllDayGuardId)?.start_date.toISOString()).toBe(
            '2026-11-26T03:00:00.000Z',
        );
        expect(byId.get(alreadyAllDayGuardId)?.end_date.toISOString()).toBe(
            '2026-11-27T02:59:59.000Z',
        );
    });
});

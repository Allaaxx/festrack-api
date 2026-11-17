import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/postgres/index.js';
import {
    eventsTable,
    usersTable,
    shopsTable,
} from '../../../db/postgres/schemas/index.js';
import { event, user, shop } from '../../../tests/index.js';
import { PostgresEventRepository } from './event-repository.js';
import { EventNotFoundError } from '../../../errors/event.js';

describe('Postgres Event Repository', () => {
    let sut: PostgresEventRepository;

    beforeEach(async () => {
        sut = new PostgresEventRepository();
        await db.insert(usersTable).values(user);
        await db.insert(shopsTable).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    describe('create', () => {
        it('should create an event on db with correct dates', async () => {
            const result = await sut.create({
                ...event,
                shop_id: shop.id,
                created_by_user_id: user.id,
            });

            expect(result.id).toBeDefined();
            expect(result.name).toBe(event.name);
            expect(result.description).toBe(event.description);
            expect(result.shop_id).toBe(shop.id);
            expect(result.created_by_user_id).toBe(user.id);
            expect(dayjs(result.start_date).toISOString()).toBe(
                dayjs(event.start_date).toISOString(),
            );
            expect(dayjs(result.end_date).toISOString()).toBe(
                dayjs(event.end_date).toISOString(),
            );
            expect(result.tag).toBeNull();
        });

        it('should create an event with undefined tag defaulting to null', async () => {
            const { tag: _tag, ...eventWithoutTag } = event;
            const result = await sut.create({
                ...eventWithoutTag,
                shop_id: shop.id,
                created_by_user_id: user.id,
            });

            expect(result.tag).toBeNull();
        });

        it('should create an event with explicit tag', async () => {
            const result = await sut.create({
                ...event,
                shop_id: shop.id,
                created_by_user_id: user.id,
                tag: 'business',
            });

            expect(result.tag).toBe('business');
        });

        it('should throw if database throws', async () => {
            jest.spyOn(sut['database'], 'insert').mockImplementationOnce(() => {
                throw new Error();
            });

            await expect(
                sut.create({
                    ...event,
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                }),
            ).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should return event by id', async () => {
            await db.insert(eventsTable).values({
                ...event,
                tag: event.tag ?? 'etc',
                shop_id: shop.id,
                created_by_user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            });

            const result = await sut.findById(event.id);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(event.id);
            expect(result?.name).toBe(event.name);
            expect(result?.shop_id).toBe(shop.id);
            expect(result?.created_by_user_id).toBe(user.id);
        });

        it('should return null if event is not found', async () => {
            const result = await sut.findById(event.id);

            expect(result).toBeNull();
        });
    });

    describe('findByShopId', () => {
        it('should return all events for a shop', async () => {
            await db.insert(eventsTable).values({
                ...event,
                tag: event.tag ?? 'etc',
                shop_id: shop.id,
                created_by_user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            });

            const result = await sut.findByShopId(shop.id);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(event.id);
            expect(result[0].shop_id).toBe(shop.id);
            expect(result[0].created_by_user_id).toBe(user.id);
        });

        it('should return empty list if shop has no events', async () => {
            const result = await sut.findByShopId(shop.id);

            expect(result).toEqual([]);
        });
    });

    describe('findByUserId', () => {
        it('should return all events for a user with tag property (default and custom)', async () => {
            const secondEventId = '33333333-3333-4333-8333-333333333333';
            await db.insert(eventsTable).values([
                {
                    ...event,
                    tag: 'etc',
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    start_date: new Date(event.start_date),
                    end_date: new Date(event.end_date),
                },
                {
                    ...event,
                    id: secondEventId,
                    name: 'Custom Tag Event',
                    tag: 'festival',
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    start_date: new Date(event.start_date),
                    end_date: new Date(event.end_date),
                },
            ]);

            const result = await sut.findByUserId(user.id);

            expect(result).toHaveLength(2);
            const defaultEvt = result.find((e) => e.id === event.id);
            const customEvt = result.find((e) => e.id === secondEventId);

            expect(defaultEvt).toBeDefined();
            expect(defaultEvt?.tag).toBe('etc');
            expect(defaultEvt?.created_by_user_id).toBe(user.id);

            expect(customEvt).toBeDefined();
            expect(customEvt?.tag).toBe('festival');
            expect(customEvt?.created_by_user_id).toBe(user.id);
        });

        it('should return empty list if user has no events', async () => {
            const result = await sut.findByUserId(user.id);

            expect(result).toEqual([]);
        });
    });

    describe('update', () => {
        it('should update event fields and dates on db', async () => {
            await db.insert(eventsTable).values({
                ...event,
                tag: event.tag ?? 'etc',
                shop_id: shop.id,
                created_by_user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            });

            const updatedData = {
                name: 'Updated Name',
                start_date: '2026-10-01T00:00:00.000Z',
                end_date: '2026-10-02T00:00:00.000Z',
            };

            const result = await sut.update(event.id, updatedData);

            expect(result.name).toBe(updatedData.name);
            expect(dayjs(result.start_date).toISOString()).toBe(
                dayjs(updatedData.start_date).toISOString(),
            );
            expect(dayjs(result.end_date).toISOString()).toBe(
                dayjs(updatedData.end_date).toISOString(),
            );
        });

        it('should update event tag on db', async () => {
            await db.insert(eventsTable).values({
                ...event,
                tag: event.tag ?? 'etc',
                shop_id: shop.id,
                created_by_user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            });

            const result = await sut.update(event.id, {
                tag: 'wedding',
            });

            expect(result.tag).toBe('wedding');

            const fromDb = await sut.findById(event.id);
            expect(fromDb?.tag).toBe('wedding');
        });

        it('should clear event tag on db when updating tag to null', async () => {
            await db.insert(eventsTable).values({
                ...event,
                tag: 'wedding',
                shop_id: shop.id,
                created_by_user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            });

            const result = await sut.update(event.id, {
                tag: null,
            });

            expect(result.tag).toBeNull();

            const fromDb = await sut.findById(event.id);
            expect(fromDb?.tag).toBeNull();
        });

        it('should throw EventNotFoundError if event does not exist', async () => {
            await expect(
                sut.update(event.id, { name: 'Non Existent' }),
            ).rejects.toThrow(new EventNotFoundError(event.id));
        });
    });

    describe('delete', () => {
        it('should delete event from db and return deleted event', async () => {
            await db.insert(eventsTable).values({
                ...event,
                tag: event.tag ?? 'etc',
                shop_id: shop.id,
                created_by_user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            });

            const result = await sut.delete(event.id);

            expect(result.id).toBe(event.id);

            const [searchOnDb] = await db
                .select()
                .from(eventsTable)
                .where(eq(eventsTable.id, event.id));
            expect(searchOnDb).toBeUndefined();
        });

        it('should throw EventNotFoundError if event does not exist', async () => {
            await expect(sut.delete(event.id)).rejects.toThrow(
                new EventNotFoundError(event.id),
            );
        });
    });

    describe('reassignTag', () => {
        it('should update tag from fromSlug to toSlug for all events in the specified shop', async () => {
            const { id: _id, ...eventData } = event;
            const event1 = await sut.create({
                ...eventData,
                shop_id: shop.id,
                created_by_user_id: user.id,
                tag: 'festival',
            });
            const event2 = await sut.create({
                ...eventData,
                shop_id: shop.id,
                created_by_user_id: user.id,
                tag: 'festival',
            });
            const event3 = await sut.create({
                ...eventData,
                shop_id: shop.id,
                created_by_user_id: user.id,
                tag: 'wedding',
            });

            const count = await sut.reassignTag(shop.id, 'festival', 'etc');
            expect(count).toBe(2);

            const found1 = await sut.findById(event1.id);
            expect(found1?.tag).toBe('etc');

            const found2 = await sut.findById(event2.id);
            expect(found2?.tag).toBe('etc');

            const found3 = await sut.findById(event3.id);
            expect(found3?.tag).toBe('wedding');
        });

        it('should not update events belonging to another shop with the same fromSlug', async () => {
            const otherShopId = '00000000-0000-4000-8000-000000000099';
            await db.insert(shopsTable).values({
                id: otherShopId,
                name: 'Other Shop Events',
                description: 'Other shop description',
            });

            try {
                const { id: _id, ...eventData } = event;
                const otherEvent = await sut.create({
                    ...eventData,
                    shop_id: otherShopId,
                    created_by_user_id: user.id,
                    tag: 'festival',
                });

                const count = await sut.reassignTag(shop.id, 'festival', 'etc');
                expect(count).toBe(0);

                const foundOther = await sut.findById(otherEvent.id);
                expect(foundOther?.tag).toBe('festival');
            } finally {
                await db
                    .delete(eventsTable)
                    .where(eq(eventsTable.shop_id, otherShopId));
                await db
                    .delete(shopsTable)
                    .where(eq(shopsTable.id, otherShopId));
            }
        });
    });
});

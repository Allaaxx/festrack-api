import dayjs from 'dayjs';
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/postgres/index.js';
import {
    usersTable,
    eventsTable,
    transactionsTable,
    shopsTable,
} from '../../../db/postgres/schemas/index.js';
import { TransactionType } from '../../../domain/index.js';
import { transaction, user, shop } from '../../../tests/index.js';
import { PostgresTransactionRepository } from './transaction-repository.js';
import { TransactionNotFoundError } from '../../../errors/transaction.js';

describe('Postgres Transaction Repository', () => {
    let sut: PostgresTransactionRepository;

    beforeEach(async () => {
        sut = new PostgresTransactionRepository();
        await db.insert(usersTable).values(user);
        await db.insert(shopsTable).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    describe('create', () => {
        it('should create transaction on db', async () => {
            const result = await sut.create({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
            });

            expect(result.name).toBe(transaction.name);
            expect(result.type).toBe(transaction.type);
            expect(result.shop_id).toBe(shop.id);
            expect(result.created_by_user_id).toBe(user.id);
            expect(result.user_id).toBe(user.id);
            expect(String(result.amount)).toBe(String(transaction.amount));
            expect(dayjs(result.date).daysInMonth()).toBe(
                dayjs(transaction.date).daysInMonth(),
            );
            expect(dayjs(result.date).month()).toBe(
                dayjs(transaction.date).month(),
            );
            expect(dayjs(result.date).year()).toBe(
                dayjs(transaction.date).year(),
            );
        });
    });

    describe('findById', () => {
        it('should return transaction by id', async () => {
            await db.insert(transactionsTable).values({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                date: new Date(transaction.date),
                amount: transaction.amount.toString(),
            });

            const result = await sut.findById(transaction.id);

            expect(result?.id).toBe(transaction.id);
            expect(result?.shop_id).toBe(shop.id);
            expect(result?.name).toBe(transaction.name);
        });

        it('should return null if transaction is not found', async () => {
            const result = await sut.findById(transaction.id);

            expect(result).toBeNull();
        });
    });

    describe('findByShopId', () => {
        const filters = {
            from: '2020-01-01',
            to: '2025-12-31',
        };

        it('should return transactions of the provided shop', async () => {
            const date = '2024-01-02';
            await db.insert(transactionsTable).values({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                date: new Date(date),
                amount: transaction.amount.toString(),
            });

            const result = await sut.findByShopId(shop.id, filters);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe(transaction.name);
            expect(result[0].shop_id).toBe(shop.id);
        });

        it('should return empty list if shop has no transactions', async () => {
            const result = await sut.findByShopId(shop.id, filters);

            expect(result).toEqual([]);
        });

        it('should return transactions ordered chronologically descending (newest first)', async () => {
            const oldest = {
                ...transaction,
                id: faker.string.uuid(),
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Oldest',
                date: new Date('2024-01-10'),
                amount: '10.00',
            };
            const middle = {
                ...transaction,
                id: faker.string.uuid(),
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Middle',
                date: new Date('2024-05-20'),
                amount: '20.00',
            };
            const newest = {
                ...transaction,
                id: faker.string.uuid(),
                shop_id: shop.id,
                created_by_user_id: user.id,
                name: 'Newest',
                date: new Date('2024-11-15'),
                amount: '30.00',
            };

            await db.insert(transactionsTable).values([middle, oldest, newest]);

            const result = await sut.findByShopId(shop.id);

            expect(result.length).toBe(3);
            expect(result[0].id).toBe(newest.id);
            expect(result[1].id).toBe(middle.id);
            expect(result[2].id).toBe(oldest.id);
        });

        it('should filter transactions by from date', async () => {
            await db.insert(transactionsTable).values([
                {
                    ...transaction,
                    id: faker.string.uuid(),
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    date: new Date('2023-01-01'),
                    amount: '10.00',
                },
                {
                    ...transaction,
                    id: faker.string.uuid(),
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    date: new Date('2024-06-01'),
                    amount: '20.00',
                },
            ]);

            const result = await sut.findByShopId(shop.id, {
                from: '2024-01-01',
            });

            expect(result.length).toBe(1);
            expect(dayjs(result[0].date).year()).toBe(2024);
        });

        it('should filter transactions by to date', async () => {
            await db.insert(transactionsTable).values([
                {
                    ...transaction,
                    id: faker.string.uuid(),
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    date: new Date('2023-01-01'),
                    amount: '10.00',
                },
                {
                    ...transaction,
                    id: faker.string.uuid(),
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    date: new Date('2024-06-01'),
                    amount: '20.00',
                },
            ]);

            const result = await sut.findByShopId(shop.id, {
                to: '2023-12-31',
            });

            expect(result.length).toBe(1);
            expect(dayjs(result[0].date).year()).toBe(2023);
        });

        it('should filter transactions by event_id', async () => {
            const eventId = faker.string.uuid();
            await db.insert(eventsTable).values({
                id: eventId,
                name: 'Vacation',
                start_date: new Date('2026-06-01'),
                end_date: new Date('2026-06-15'),
                shop_id: shop.id,
                created_by_user_id: user.id,
            });

            await db.insert(transactionsTable).values([
                {
                    ...transaction,
                    id: faker.string.uuid(),
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    date: new Date(transaction.date),
                    amount: '10.00',
                    event_id: eventId,
                },
                {
                    ...transaction,
                    id: faker.string.uuid(),
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                    date: new Date(transaction.date),
                    amount: '20.00',
                    event_id: null,
                },
            ]);

            const result = await sut.findByShopId(shop.id, {
                event_id: eventId,
            });

            expect(result.length).toBe(1);
            expect(result[0].event_id).toBe(eventId);
        });

        it('should safely ignore invalid from or to dates without throwing', async () => {
            await db.insert(transactionsTable).values({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                date: new Date('2024-01-01'),
                amount: '10.00',
            });

            const result = await sut.findByShopId(shop.id, {
                from: 'invalid-date',
                to: 'another-invalid-date',
            });

            expect(result.length).toBe(1);
        });
    });

    describe('findByUserId', () => {
        const filters = {
            from: '2020-01-01',
            to: '2025-12-31',
        };

        it('should return transactions created by the provided user', async () => {
            const date = '2024-01-02';
            await db.insert(transactionsTable).values({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                date: new Date(date),
                amount: transaction.amount.toString(),
            });

            const result = await sut.findByUserId(user.id, filters);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe(transaction.name);
        });
    });

    describe('update', () => {
        it('should update a transaction on db', async () => {
            await db.insert(transactionsTable).values({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                date: new Date(transaction.date),
                amount: transaction.amount.toString(),
            });

            const params = {
                name: faker.commerce.productName(),
                date: faker.date.anytime().toISOString(),
                type: 'EXPENSE' as TransactionType,
                amount: Number(faker.finance.amount()),
            };

            const result = await sut.update(transaction.id, params);

            expect(result.name).toBe(params.name);
            expect(String(result.amount)).toBe(String(params.amount));
        });

        it('should throw TransactionNotFoundError if transaction does not exist', async () => {
            await expect(
                sut.update(transaction.id, {
                    name: 'any_name',
                }),
            ).rejects.toThrow(new TransactionNotFoundError(transaction.id));
        });
    });

    describe('delete', () => {
        it('should delete a transaction on db', async () => {
            await db.insert(transactionsTable).values({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                date: new Date(transaction.date),
                amount: transaction.amount.toString(),
            });

            const result = await sut.delete(transaction.id);

            expect(result.id).toBe(transaction.id);

            const [searchOnDb] = await db
                .select()
                .from(transactionsTable)
                .where(eq(transactionsTable.id, transaction.id));
            expect(searchOnDb).toBeUndefined();
        });

        it('should throw TransactionNotFoundError if transaction does not exist', async () => {
            await expect(sut.delete(transaction.id)).rejects.toThrow(
                new TransactionNotFoundError(transaction.id),
            );
        });

        it('should nullify event_id when associated event is deleted', async () => {
            const eventId = faker.string.uuid();
            await db.insert(eventsTable).values({
                id: eventId,
                name: 'Vacation',
                start_date: new Date('2026-06-01'),
                end_date: new Date('2026-06-15'),
                shop_id: shop.id,
                created_by_user_id: user.id,
            });

            const created = await sut.create({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
                event_id: eventId,
            });
            expect(created.event_id).toBe(eventId);

            await db.delete(eventsTable).where(eq(eventsTable.id, eventId));

            const found = await sut.findById(created.id);
            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.event_id).toBeNull();
        });
    });
});

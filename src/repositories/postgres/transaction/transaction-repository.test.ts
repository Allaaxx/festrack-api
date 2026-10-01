import dayjs from 'dayjs';
import { faker } from '@faker-js/faker';
import { TransactionType } from '@prisma/client';
import { prisma } from '../../../../prisma/prisma.js';
import { transaction, user } from '../../../tests/index.js';
import { PostgresTransactionRepository } from './transaction-repository.js';
import { TransactionNotFoundError } from '../../../errors/transaction.js';

describe('Postgres Transaction Repository', () => {
    let sut: PostgresTransactionRepository;

    beforeEach(() => {
        sut = new PostgresTransactionRepository();
    });

    describe('create', () => {
        it('should create transaction on db', async () => {
            await prisma.user.create({ data: user });

            const result = await sut.create({
                ...transaction,
                user_id: user.id,
            });

            expect(result.name).toBe(transaction.name);
            expect(result.type).toBe(transaction.type);
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
            await prisma.user.create({ data: user });
            await prisma.transaction.create({
                data: {
                    ...transaction,
                    user_id: user.id,
                    amount: transaction.amount.toString(),
                },
            });

            const result = await sut.findById(transaction.id);

            expect(result?.id).toBe(transaction.id);
            expect(result?.name).toBe(transaction.name);
        });

        it('should return null if transaction is not found', async () => {
            const result = await sut.findById(transaction.id);

            expect(result).toBeNull();
        });
    });

    describe('findByUserId', () => {
        const from = '2020-01-01';
        const to = '2025-12-31';

        it('should return transactions of the provided user', async () => {
            const date = '2024-01-02';
            await prisma.user.create({ data: user });
            await prisma.transaction.create({
                data: {
                    ...transaction,
                    date: new Date(date),
                    user_id: user.id,
                    amount: transaction.amount.toString(),
                },
            });

            const result = await sut.findByUserId(user.id, from, to);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe(transaction.name);
        });

        it('should return empty list if user has no transactions', async () => {
            const result = await sut.findByUserId(user.id, from, to);

            expect(result).toEqual([]);
        });
    });

    describe('update', () => {
        it('should update a transaction on db', async () => {
            await prisma.user.create({ data: user });
            await prisma.transaction.create({
                data: {
                    ...transaction,
                    user_id: user.id,
                    amount: transaction.amount.toString(),
                },
            });

            const params = {
                user_id: user.id,
                name: faker.commerce.productName(),
                date: faker.date.anytime().toISOString(),
                type: TransactionType.EXPENSE,
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
            await prisma.user.create({ data: user });
            await prisma.transaction.create({
                data: {
                    ...transaction,
                    user_id: user.id,
                    amount: transaction.amount.toString(),
                },
            });

            const result = await sut.delete(transaction.id);

            expect(result.id).toBe(transaction.id);

            const searchOnDb = await prisma.transaction.findUnique({
                where: { id: transaction.id },
            });
            expect(searchOnDb).toBeNull();
        });

        it('should throw TransactionNotFoundError if transaction does not exist', async () => {
            await expect(sut.delete(transaction.id)).rejects.toThrow(
                new TransactionNotFoundError(transaction.id),
            );
        });
    });
});

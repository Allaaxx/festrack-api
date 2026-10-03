import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/postgres/index.js';
import {
    usersTable,
    transactionsTable,
    account,
} from '../../../db/postgres/schemas/index.js';
import { user as fakeUser } from '../../../tests/index.js';
import { PostgresUserRepository } from './user-repository.js';
import { UserNotFoundError } from '../../../errors/user.js';

describe('Postgres User Repository', () => {
    let sut: PostgresUserRepository;

    beforeEach(() => {
        sut = new PostgresUserRepository();
    });

    describe('create', () => {
        it('should create user on db', async () => {
            const result = await sut.create(fakeUser);

            expect(result.id).toBe(fakeUser.id);
            expect(result.email).toBe(fakeUser.email);
            expect(result.first_name).toBe(fakeUser.first_name);
            expect(result.last_name).toBe(fakeUser.last_name);
        });
    });

    describe('findById', () => {
        it('should get user by id on db', async () => {
            await sut.create(fakeUser);

            const result = await sut.findById(fakeUser.id);

            expect(result).toMatchObject({
                id: fakeUser.id,
                email: fakeUser.email,
                first_name: fakeUser.first_name,
                last_name: fakeUser.last_name,
            });
        });

        it('should return null if user not found', async () => {
            const result = await sut.findById(fakeUser.id);

            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should get user by email on db', async () => {
            await sut.create(fakeUser);

            const result = await sut.findByEmail(fakeUser.email);

            expect(result).toMatchObject({
                id: fakeUser.id,
                email: fakeUser.email,
                first_name: fakeUser.first_name,
                last_name: fakeUser.last_name,
            });
        });

        it('should return null if email not found', async () => {
            const result = await sut.findByEmail(fakeUser.email);

            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update user on db', async () => {
            await sut.create(fakeUser);

            const updateUserParams = {
                first_name: faker.person.firstName(),
                last_name: faker.person.lastName(),
                email: faker.internet.email(),
                password: faker.internet.password(),
            };

            const result = await sut.update(fakeUser.id, updateUserParams);

            expect(result.first_name).toBe(updateUserParams.first_name);
            expect(result.last_name).toBe(updateUserParams.last_name);
            expect(result.email).toBe(updateUserParams.email);
        });

        it('should throw UserNotFoundError if user does not exist', async () => {
            await expect(
                sut.update(fakeUser.id, { first_name: 'Any' }),
            ).rejects.toThrow(new UserNotFoundError(fakeUser.id));
        });
    });

    describe('delete', () => {
        it('should delete a user on db', async () => {
            await sut.create(fakeUser);

            const result = await sut.delete(fakeUser.id);

            expect(result).toMatchObject({
                id: fakeUser.id,
                email: fakeUser.email,
                first_name: fakeUser.first_name,
                last_name: fakeUser.last_name,
            });

            const [searchOnDb] = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, fakeUser.id));
            expect(searchOnDb).toBeUndefined();
        });

        it('should throw UserNotFoundError if user does not exist', async () => {
            await expect(sut.delete(fakeUser.id)).rejects.toThrow(
                new UserNotFoundError(fakeUser.id),
            );
        });
    });

    describe('getBalance', () => {
        const from = '2024-01-01';
        const to = '2026-12-31';

        it('should get user balance on db', async () => {
            const user = await sut.create(fakeUser);

            await db.insert(transactionsTable).values([
                {
                    name: faker.string.sample(),
                    amount: '5000',
                    date: new Date(from),
                    type: 'EARNING',
                    user_id: user.id,
                },
                {
                    name: faker.string.sample(),
                    amount: '2000',
                    date: new Date(from),
                    type: 'EXPENSE',
                    user_id: user.id,
                },
                {
                    name: faker.string.sample(),
                    amount: '1000',
                    date: new Date(from),
                    type: 'INVESTMENT',
                    user_id: user.id,
                },
            ]);

            const result = await sut.getBalance(user.id, from, to);

            expect(Number(result.balance)).toBe(2000);
            expect(Number(result.earnings)).toBe(5000);
            expect(Number(result.expenses)).toBe(2000);
            expect(Number(result.investments)).toBe(1000);
            expect(result.earningsPercentage).toBe(62);
            expect(result.expensePercentage).toBe(25);
            expect(result.investmentsPercentage).toBe(12);
        });

        it('should return zero percentages and balance when no transactions exist', async () => {
            const user = await sut.create(fakeUser);

            const result = await sut.getBalance(user.id, from, to);

            expect(result.balance).toBe('0');
            expect(result.earnings).toBe('0');
            expect(result.expenses).toBe('0');
            expect(result.investments).toBe('0');
            expect(result.earningsPercentage).toBe(0);
            expect(result.expensePercentage).toBe(0);
            expect(result.investmentsPercentage).toBe(0);
        });
    });

    describe('listAccounts & deleteAccount', () => {
        it('should list all accounts for a user and delete specific provider account', async () => {
            const user = await sut.create(fakeUser);

            await db.insert(account).values([
                {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    providerId: 'credential',
                    accountId: user.id,
                },
                {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    providerId: 'google',
                    accountId: 'google-sub-xyz',
                },
            ]);

            const accounts = await sut.listAccounts(user.id);
            expect(accounts.length).toBe(2);
            const providers = accounts.map((a) => a.providerId);
            expect(providers).toContain('credential');
            expect(providers).toContain('google');

            const deleted = await sut.deleteAccount(user.id, 'google');
            expect(deleted).toBeDefined();
            expect(deleted.providerId).toBe('google');

            const remainingAccounts = await sut.listAccounts(user.id);
            expect(remainingAccounts.length).toBe(1);
            expect(remainingAccounts[0].providerId).toBe('credential');
        });
    });
});

import { faker } from '@faker-js/faker';
import { prisma } from '../../../../prisma/prisma.js';
import { user as fakeUser } from '../../../tests/index.js';
import { PostgresUserRepository } from './user-repository.js';
import { UserNotFoundError } from '../../../errors/user.js';

describe('Postgres User Repository', () => {
    let sut;

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
            await prisma.user.create({ data: fakeUser });

            const result = await sut.findById(fakeUser.id);

            expect(result).toStrictEqual(fakeUser);
        });

        it('should return null if user not found', async () => {
            const result = await sut.findById(fakeUser.id);

            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should get user by email on db', async () => {
            await prisma.user.create({ data: fakeUser });

            const result = await sut.findByEmail(fakeUser.email);

            expect(result).toStrictEqual(fakeUser);
        });

        it('should return null if email not found', async () => {
            const result = await sut.findByEmail(fakeUser.email);

            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update user on db', async () => {
            await prisma.user.create({ data: fakeUser });

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
            await prisma.user.create({ data: fakeUser });

            const result = await sut.delete(fakeUser.id);

            expect(result).toStrictEqual(fakeUser);

            const searchOnDb = await prisma.user.findUnique({
                where: { id: fakeUser.id },
            });
            expect(searchOnDb).toBeNull();
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
            const user = await prisma.user.create({ data: fakeUser });

            await prisma.transaction.createMany({
                data: [
                    {
                        name: faker.string.sample(),
                        amount: 5000,
                        date: new Date(from),
                        type: 'EARNING',
                        user_id: user.id,
                    },
                    {
                        name: faker.string.sample(),
                        amount: 2000,
                        date: new Date(from),
                        type: 'EXPENSE',
                        user_id: user.id,
                    },
                    {
                        name: faker.string.sample(),
                        amount: 1000,
                        date: new Date(from),
                        type: 'INVESTMENT',
                        user_id: user.id,
                    },
                ],
            });

            const result = await sut.getBalance(user.id, from, to);

            expect(result.balance.toNumber()).toBe(2000);
            expect(result.earnings.toNumber()).toBe(5000);
            expect(result.expenses.toNumber()).toBe(2000);
            expect(result.investments.toNumber()).toBe(1000);
        });
    });
});

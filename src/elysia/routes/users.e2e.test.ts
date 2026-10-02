import { describe, it, expect } from 'bun:test';
import { elysiaApp, testClient } from '../index.js';
import { user } from '../../tests/fixtures/user.js';
import { faker } from '@faker-js/faker';
import { TransactionType } from '../../domain/index.js';
import { PostgresTransactionRepository } from '../../repositories/postgres/index.js';

describe('Users Routes (Elysia E2E)', () => {
    const client = testClient(elysiaApp);
    const from = '2020-01-01';
    const to = '2027-12-31';

    it('GET /api/users/me should return 200 if user is authenticated', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .get('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
    });

    it('GET /api/users/me should return 401 when user is not authenticated', async () => {
        const response = await client.get('/api/users/me');
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('PATCH /api/users/me should return 200 when user is updated', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const updateUserParams = {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
        };

        const response = await client
            .patch('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send(updateUserParams);

        expect(response.status).toBe(200);
        expect(response.body.first_name).toBe(updateUserParams.first_name);
        expect(response.body.last_name).toBe(updateUserParams.last_name);
        expect(response.body.email).toBe(updateUserParams.email);
        expect(response.body.password).not.toBe(updateUserParams.password);
    });

    it('PATCH /api/users/me should return 400 when email is already in use', async () => {
        const emailOne = faker.internet.email();
        const emailTwo = faker.internet.email();

        const { body: createdUserOne } = await client.post('/api/auth').send({
            ...user,
            email: emailOne,
            id: undefined,
        });

        await client.post('/api/auth').send({
            ...user,
            email: emailTwo,
            id: undefined,
        });

        const response = await client
            .patch('/api/users/me')
            .set('Authorization', `Bearer ${createdUserOne.tokens.accessToken}`)
            .send({
                email: emailTwo,
            });

        expect(response.status).toBe(400);
    });

    it('PATCH /api/users/me should return 400 when body has unexpected properties', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .patch('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                first_name: faker.person.firstName(),
                phone: faker.phone.number(),
            });

        expect(response.status).toBe(400);
    });

    it('DELETE /api/users/me should return 200 when user is deleted', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .delete('/api/users/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdUser.id);
    });

    it('GET /api/users/me/balance should return 200 when user balance is calculated', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const transactionRepository = new PostgresTransactionRepository();

        await transactionRepository.create({
            user_id: createdUser.id,
            name: faker.commerce.productName(),
            date: from,
            type: TransactionType.EARNING,
            amount: 10000,
        });

        await transactionRepository.create({
            user_id: createdUser.id,
            name: faker.commerce.productName(),
            date: from,
            type: TransactionType.EXPENSE,
            amount: 2000,
        });

        await transactionRepository.create({
            user_id: createdUser.id,
            name: faker.commerce.productName(),
            date: to,
            type: TransactionType.INVESTMENT,
            amount: 2000,
        });

        const response = await client
            .get(`/api/users/me/balance?from=${from}&to=${to}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            earnings: '10000',
            earningsPercentage: 71,
            expensePercentage: 14,
            expenses: '2000',
            investments: '2000',
            investmentsPercentage: 14,
            balance: '6000',
        });
    });

    it('GET /api/users/me/balance should return 400 when query dates are invalid', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            email: faker.internet.email(),
            id: undefined,
        });

        const response = await client
            .get('/api/users/me/balance?from=invalid&to=2027-12-31')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(400);
    });
});

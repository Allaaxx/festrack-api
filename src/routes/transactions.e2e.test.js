import request from 'supertest';
import { app } from '../app.js';
import { transaction, user } from '../tests/index.js';
import { TransactionType } from '@prisma/client';

describe('Transaction Routes E2E Tests', () => {
    const from = '2026-01-01';
    const to = '2027-01-01';

    it('POST /api/transactions should return 201 when creating a transaction successfully', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(transaction.name);
        expect(response.body.type).toBe(transaction.type);
        expect(response.body.amount).toBe(String(transaction.amount));
    });

    it('GET /api/transaction?userId should return 200 when fetching transactions successfully', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const { body: createdTransaction } = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                user_id: createdUser.id,
                id: undefined,
            });

        const response = await request(app)
            .get(`/api/transactions`)
            .query({
                from: from,
                to: to,
            })
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body[0].id).toEqual(createdTransaction.id);
    });

    it('PATCH /api/transactions/:transactionId should return 200 when updating a transaction successfully', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const { body: createdTransaction } = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
            });

        const response = await request(app)
            .patch(`/api/transactions/${createdTransaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                amount: 100,
                type: TransactionType.INVESTMENT,
            });

        expect(response.status).toBe(200);
        expect(response.body.type).toBe(TransactionType.INVESTMENT);
        expect(response.body.amount).toBe(String(100));
    });

    it('DELETE /api/transactions/:transactionId should return 200 when deleting a transaction successfully', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const { body: createdTransaction } = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
            });

        const response = await request(app)
            .delete(`/api/transactions/${createdTransaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toEqual(createdTransaction.id);
    });

    it('PATCH /api/transactions/:transactionId should return 404 when transaction is not found', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .patch(`/api/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                amount: 100,
                type: TransactionType.INVESTMENT,
            });

        expect(response.status).toBe(404);
    });

    it('DELETE /api/transactions/:transactionId should return 404 when transaction is not found', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .delete(`/api/transactions/${transaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
    });

    it('GET /api/transactions/:userId should return 404 when fetching for non-existing user', async () => {
        const { body: createdUser } = await request(app)
            .post(`/api/users`)
            .send({
                ...user,
                id: undefined,
            });

        const response = await request(app)
            .get(`/api/transactions/${user.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
    });
});

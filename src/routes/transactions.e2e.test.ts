import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { event, transaction, user } from '../tests/index.js';
import { TransactionType } from '../domain/index.js';

describe('Transaction Routes E2E Tests (Elysia)', () => {
    const client = testClient(app);
    const from = '2020-01-01';
    const to = '2027-12-31';

    it('POST /api/transactions/me should return 201 when creating a transaction successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .post('/api/transactions/me')
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

    it('GET /api/transactions/me should return 200 when fetching transactions successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                user_id: createdUser.id,
                id: undefined,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({
                from,
                to,
            })
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body[0].id).toEqual(createdTransaction.id);
    });

    it('PATCH /api/transactions/me/:transactionId should return 200 when updating a transaction successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
            });

        const response = await client
            .patch(`/api/transactions/me/${createdTransaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                amount: 100,
                type: TransactionType.INVESTMENT,
            });

        expect(response.status).toBe(200);
        expect(response.body.type).toBe(TransactionType.INVESTMENT);
        expect(response.body.amount).toBe(String(100));
    });

    it('DELETE /api/transactions/me/:transactionId should return 200 when deleting a transaction successfully', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
            });

        const response = await client
            .delete(`/api/transactions/me/${createdTransaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toEqual(createdTransaction.id);
    });

    it('PATCH /api/transactions/me/:transactionId should return 404 when transaction is not found', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .patch(`/api/transactions/me/${transaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                amount: 100,
                type: TransactionType.INVESTMENT,
            });

        expect(response.status).toBe(404);
    });

    it('DELETE /api/transactions/me/:transactionId should return 404 when transaction is not found', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .delete(`/api/transactions/me/${transaction.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
    });

    it('GET /api/transactions/me/:userId should return 404 when route does not exist', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .get(`/api/transactions/me/${user.id}`)
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(404);
    });

    it('POST /api/transactions/me should return 201 when creating transaction linked to an event', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
                event_id: createdEvent.id,
            });

        expect(response.status).toBe(201);
        expect(response.body.event_id).toBe(createdEvent.id);
    });

    it('POST /api/transactions/me should return 404 when linking to non-existent event', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
                event_id: user.id,
            });

        expect(response.status).toBe(404);
    });

    it('PATCH /api/transactions/me/:transactionId should return 400 when transactionId is invalid UUID', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .patch('/api/transactions/me/invalid-uuid')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                amount: 100,
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('DELETE /api/transactions/me/:transactionId should return 400 when transactionId is invalid UUID', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .delete('/api/transactions/me/invalid-uuid')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('POST /api/transactions/me should return 401 when token is missing', async () => {
        const response = await client.post('/api/transactions/me').send({
            ...transaction,
            id: undefined,
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/transactions/me should return 400 when type is invalid', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
                type: 'INVALID_TYPE',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            'Type must be EXPENSE, EARNING or INVESTMENT.',
        );
    });

    it('POST /api/transactions/me should return 400 when amount is negative or zero', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
                amount: 0,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Amount must be greater than 0.');
    });

    it('POST /api/transactions/me should return 400 when unexpected properties are provided', async () => {
        const { body: createdUser } = await client.post('/api/auth').send({
            ...user,
            id: undefined,
        });

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', `Bearer ${createdUser.tokens.accessToken}`)
            .send({
                ...transaction,
                id: undefined,
                extra_field: 'not allowed',
            });

        expect(response.status).toBe(400);
    });
});

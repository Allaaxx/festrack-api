import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { event, transaction } from '../tests/index.js';
import { TransactionType } from '../domain/index.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';

describe('Transaction Routes E2E Tests (Elysia)', () => {
    const client = testClient(app);
    const from = '2020-01-01';
    const to = '2027-12-31';

    it('POST /api/transactions/me should return 201 when creating a transaction successfully with Bearer token', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(transaction.name);
        expect(response.body.type).toBe(transaction.type);
        expect(response.body.amount).toBe(String(transaction.amount));
    });

    it('POST /api/transactions/me should return 201 when creating a transaction successfully with Cookie', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/transactions/me')
            .set('Cookie', authUser.cookieHeader)
            .send({
                ...transaction,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(transaction.name);
        expect(response.body.type).toBe(transaction.type);
        expect(response.body.amount).toBe(String(transaction.amount));
    });

    it('GET /api/transactions/me should return 200 when fetching transactions successfully with Bearer token', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                user_id: authUser.user.id,
                id: undefined,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({
                from,
                to,
            })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body[0].id).toEqual(createdTransaction.id);
    });

    it('GET /api/transactions/me should return 200 when fetching transactions successfully with Cookie', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Cookie', authUser.cookieHeader)
            .send({
                ...transaction,
                user_id: authUser.user.id,
                id: undefined,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({
                from,
                to,
            })
            .set('Cookie', authUser.cookieHeader);

        expect(response.status).toBe(200);
        expect(response.body[0].id).toEqual(createdTransaction.id);
    });

    it('GET /api/transactions/me should return transactions sorted chronologically descending (newest first)', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: oldest } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'Oldest Transaction',
                date: '2024-01-15T00:00:00.000Z',
                id: undefined,
            });

        const { body: newest } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'Newest Transaction',
                date: '2024-12-20T00:00:00.000Z',
                id: undefined,
            });

        const { body: middle } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'Middle Transaction',
                date: '2024-06-10T00:00:00.000Z',
                id: undefined,
            });

        const response = await client
            .get('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(3);
        expect(response.body[0].id).toBe(newest.id);
        expect(response.body[1].id).toBe(middle.id);
        expect(response.body[2].id).toBe(oldest.id);
    });

    it('PATCH /api/transactions/me/:transactionId should return 200 when updating a transaction successfully', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
            });

        const response = await client
            .patch(`/api/transactions/me/${createdTransaction.id}`)
            .set('Authorization', authUser.bearerHeader)
            .send({
                amount: 100,
                type: TransactionType.INVESTMENT,
            });

        expect(response.status).toBe(200);
        expect(response.body.type).toBe(TransactionType.INVESTMENT);
        expect(response.body.amount).toBe(String(100));
    });

    it('DELETE /api/transactions/me/:transactionId should return 200 when deleting a transaction successfully', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdTransaction } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
            });

        const response = await client
            .delete(`/api/transactions/me/${createdTransaction.id}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.id).toEqual(createdTransaction.id);
    });

    it('PATCH /api/transactions/me/:transactionId should return 404 when transaction is not found', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .patch(`/api/transactions/me/${crypto.randomUUID()}`)
            .set('Authorization', authUser.bearerHeader)
            .send({
                amount: 100,
                type: TransactionType.INVESTMENT,
            });

        expect(response.status).toBe(404);
    });

    it('DELETE /api/transactions/me/:transactionId should return 404 when transaction is not found', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .delete(`/api/transactions/me/${crypto.randomUUID()}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(404);
    });

    it('GET /api/transactions/me/:userId should return 404 when route does not exist', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get(`/api/transactions/me/${authUser.user.id}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(404);
    });

    it('POST /api/transactions/me should return 201 when creating transaction linked to an event', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
                event_id: createdEvent.id,
            });

        expect(response.status).toBe(201);
        expect(response.body.event_id).toBe(createdEvent.id);
    });

    it('POST /api/transactions/me should return 404 when linking to non-existent event', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
                event_id: crypto.randomUUID(),
            });

        expect(response.status).toBe(404);
    });

    it('PATCH /api/transactions/me/:transactionId should return 400 when transactionId is invalid UUID', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .patch('/api/transactions/me/invalid-uuid')
            .set('Authorization', authUser.bearerHeader)
            .send({
                amount: 100,
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('DELETE /api/transactions/me/:transactionId should return 400 when transactionId is invalid UUID', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .delete('/api/transactions/me/invalid-uuid')
            .set('Authorization', authUser.bearerHeader);

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

    it('POST /api/transactions/me should return 401 when token is invalid or expired', async () => {
        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', 'Bearer invalid_or_expired_token')
            .send({
                ...transaction,
                id: undefined,
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/transactions/me should return 400 when type is invalid', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
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
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
                amount: 0,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Amount must be greater than 0.');
    });

    it('POST /api/transactions/me should return 400 when unexpected properties are provided', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
                extra_field: 'not allowed',
            });

        expect(response.status).toBe(400);
    });

    it('GET /api/transactions/me?event_id=:eventId should return 200 with associated transactions', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const { body: eventTx } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
                event_id: createdEvent.id,
            });

        await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                id: undefined,
                event_id: null,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({ event_id: createdEvent.id })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toBe(eventTx.id);
        expect(response.body[0].event_id).toBe(createdEvent.id);
    });

    it('GET /api/transactions/me?event_id=:eventId should return transactions dated outside event date window (temporal decoupling)', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
                start_date: '2026-06-01',
                end_date: '2026-06-15',
            });

        const { body: advanceTx } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'Advance Venue Deposit',
                date: '2026-01-15T00:00:00.000Z',
                id: undefined,
                event_id: createdEvent.id,
            });

        const { body: duringTx } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'Catering During Event',
                date: '2026-06-10T00:00:00.000Z',
                id: undefined,
                event_id: createdEvent.id,
            });

        const { body: postTx } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'Post-Event Cleanup Settlement',
                date: '2026-07-20T00:00:00.000Z',
                id: undefined,
                event_id: createdEvent.id,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({ event_id: createdEvent.id })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(3);
        expect(response.body[0].id).toBe(postTx.id);
        expect(response.body[1].id).toBe(duringTx.id);
        expect(response.body[2].id).toBe(advanceTx.id);
    });

    it('GET /api/transactions/me?event_id=:eventId should return 200 with empty array when event has no transactions', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({ event_id: createdEvent.id })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it('GET /api/transactions/me?event_id=:eventId should return 400 when event_id is not a valid UUID', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get('/api/transactions/me')
            .query({ event_id: 'not-a-valid-uuid' })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(400);
    });

    it('GET /api/transactions/me?event_id=:eventId should return 404 when event does not exist', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get('/api/transactions/me')
            .query({ event_id: crypto.randomUUID() })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Event not found.' });
    });

    it('GET /api/transactions/me?event_id=:eventId should return 403 when event belongs to another user', async () => {
        const authUser1 = await createAuthenticatedUser(client);
        const authUser2 = await createAuthenticatedUser(client);

        const { body: user2Event } = await client
            .post('/api/events/me')
            .set('Authorization', authUser2.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({ event_id: user2Event.id })
            .set('Authorization', authUser1.bearerHeader);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('GET /api/transactions/me should support combining event_id with from and to date filters', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
                start_date: '2026-06-01',
                end_date: '2026-06-15',
            });

        await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'January Transaction',
                date: '2026-01-15T00:00:00.000Z',
                id: undefined,
                event_id: createdEvent.id,
            });

        const { body: juneTx } = await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'June Transaction',
                date: '2026-06-10T00:00:00.000Z',
                id: undefined,
                event_id: createdEvent.id,
            });

        await client
            .post('/api/transactions/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...transaction,
                name: 'August Transaction',
                date: '2026-08-20T00:00:00.000Z',
                id: undefined,
                event_id: createdEvent.id,
            });

        const response = await client
            .get('/api/transactions/me')
            .query({
                event_id: createdEvent.id,
                from: '2026-05-01',
                to: '2026-07-01',
            })
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toBe(juneTx.id);
    });

    it('GET /api/transactions/me should reject unknown query parameters', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get('/api/transactions/me')
            .query({ unknown_param: 'not_allowed' })
            .set('Authorization', authUser.bearerHeader);

        expect([400, 422]).toContain(response.status);
    });
});

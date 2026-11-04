import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { TransactionType } from '../domain/index.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import { shopMembersTable } from '../db/postgres/schemas/index.js';

describe('Shop-Scoped Transaction Routes E2E Tests (Elysia)', () => {
    const client = testClient(app);
    const from = '2020-01-01';
    const to = '2027-12-31';

    const sampleTransactionData = {
        name: 'Stage Equipment Rental',
        date: '2026-06-01T00:00:00.000Z',
        type: 'EXPENSE' as const,
        amount: 250.75,
    };

    const createShopForUser = async (
        authUser: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Test Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', authUser.bearerHeader)
            .send({ name, description: 'Test shop description' });
        return response.body;
    };

    const addMemberToShop = async (
        shopId: string,
        userId: string,
        role: 'OWNER' | 'MEMBER' = 'MEMBER',
    ) => {
        await db.insert(shopMembersTable).values({
            shop_id: shopId,
            user_id: userId,
            role,
        });
    };

    const createEventInShop = async (
        authUser: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        shopId: string,
        customEvent: Record<string, any> = {},
    ) => {
        const eventRes = await client
            .post(`/api/shops/${shopId}/events`)
            .set('Authorization', authUser.bearerHeader)
            .send({
                name: 'Test Event',
                description: 'Test event description',
                start_date: '2026-06-01T00:00:00.000Z',
                end_date: '2026-06-15T00:00:00.000Z',
                ...customEvent,
            });
        return eventRes.body;
    };

    describe('POST /api/shops/:shopId/transactions', () => {
        it('should return 201 when shop OWNER creates a transaction successfully with Bearer token', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe(sampleTransactionData.name);
            expect(response.body.type).toBe(sampleTransactionData.type);
            expect(response.body.amount).toBe(
                String(sampleTransactionData.amount),
            );
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.created_by_user_id).toBe(owner.user.id);
        });

        it('should return 201 when shop MEMBER creates a transaction successfully', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', member.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            expect(response.status).toBe(201);
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.created_by_user_id).toBe(member.user.id);
        });

        it('should return 201 when creating transaction with Cookie', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Cookie', owner.cookieHeader)
                .send({
                    ...sampleTransactionData,
                });

            expect(response.status).toBe(201);
            expect(response.body.shop_id).toBe(shop.id);
        });

        it('should return 201 when creating transaction linked to an event in the same shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            const event = await createEventInShop(owner, shop.id);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    event_id: event.id,
                });

            expect(response.status).toBe(201);
            expect(response.body.event_id).toBe(event.id);
        });

        it('should return 404 when linking to an event from another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShopForUser(owner1, 'Shop 1');
            const shop2 = await createShopForUser(owner2, 'Shop 2');
            const event2 = await createEventInShop(owner2, shop2.id);

            const response = await client
                .post(`/api/shops/${shop1.id}/transactions`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    event_id: event2.id,
                });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 404 when shop does not exist', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post(`/api/shops/${crypto.randomUUID()}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Shop not found.');
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', nonMember.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden');
        });

        it('should return 401 when token is missing', async () => {
            const response = await client
                .post(`/api/shops/${crypto.randomUUID()}/transactions`)
                .send({
                    ...sampleTransactionData,
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 when type is invalid', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    type: 'INVALID_TYPE',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Type must be EXPENSE, EARNING or INVESTMENT.',
            );
        });

        it('should return 400 when amount is negative or zero', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    amount: 0,
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Amount must be greater than 0.',
            );
        });

        it('should return 400 when unexpected properties are provided', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    extra_field: 'not allowed',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/shops/:shopId/transactions', () => {
        it('should return 200 when OWNER lists shop transactions', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/transactions`)
                .query({ from, to })
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].id).toBe(createdTx.id);
        });

        it('should return 200 when MEMBER lists transactions created by other members (collaborative ledger)', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const { body: ownerTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].id).toBe(ownerTx.id);
            expect(response.body[0].created_by_user_id).toBe(owner.user.id);
        });

        it('should return 403 when non-member lists shop transactions', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', nonMember.bearerHeader);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden');
        });

        it('should return 404 when shop does not exist', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .get(`/api/shops/${crypto.randomUUID()}/transactions`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Shop not found.');
        });

        it('should filter transactions by event_id belonging to shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            const event = await createEventInShop(owner, shop.id);

            const { body: eventTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    event_id: event.id,
                });

            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                    event_id: null,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/transactions`)
                .query({ event_id: event.id })
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].id).toBe(eventTx.id);
        });

        it('should return 404 when querying transactions with event_id belonging to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShopForUser(owner1, 'Shop 1');
            const shop2 = await createShopForUser(owner2, 'Shop 2');
            const event2 = await createEventInShop(owner2, shop2.id);

            const response = await client
                .get(`/api/shops/${shop1.id}/transactions`)
                .query({ event_id: event2.id })
                .set('Authorization', owner1.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });
    });

    describe('GET /api/shops/:shopId/transactions/:id', () => {
        it('should return 200 when retrieving transaction by id', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdTx.id);
            expect(response.body.shop_id).toBe(shop.id);
        });

        it('should return 403 when non-member retrieves transaction', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', nonMember.bearerHeader);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden');
        });

        it('should return 404 when transaction belongs to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShopForUser(owner1, 'Shop 1');
            const shop2 = await createShopForUser(owner2, 'Shop 2');

            const { body: tx1 } = await client
                .post(`/api/shops/${shop1.id}/transactions`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .get(`/api/shops/${shop2.id}/transactions/${tx1.id}`)
                .set('Authorization', owner2.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Transaction not found.');
        });
    });

    describe('PATCH /api/shops/:shopId/transactions/:id', () => {
        it('should return 200 when shop member updates transaction', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .patch(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', member.bearerHeader)
                .send({
                    amount: 99.99,
                    type: TransactionType.INVESTMENT,
                });

            expect(response.status).toBe(200);
            expect(response.body.type).toBe(TransactionType.INVESTMENT);
            expect(response.body.amount).toBe(String(99.99));
        });

        it('should return 404 when updating with event_id belonging to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShopForUser(owner1, 'Shop 1');
            const shop2 = await createShopForUser(owner2, 'Shop 2');
            const event2 = await createEventInShop(owner2, shop2.id);

            const { body: createdTx } = await client
                .post(`/api/shops/${shop1.id}/transactions`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .patch(`/api/shops/${shop1.id}/transactions/${createdTx.id}`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    event_id: event2.id,
                });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 403 when non-member updates transaction', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .patch(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', nonMember.bearerHeader)
                .send({ amount: 100 });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden');
        });
    });

    describe('DELETE /api/shops/:shopId/transactions/:id', () => {
        it('should return 200 when shop member deletes transaction', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .delete(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdTx.id);

            const getResponse = await client
                .get(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(getResponse.status).toBe(404);
        });

        it('should return 403 when non-member deletes transaction', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const { body: createdTx } = await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleTransactionData,
                });

            const response = await client
                .delete(`/api/shops/${shop.id}/transactions/${createdTx.id}`)
                .set('Authorization', nonMember.bearerHeader);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden');
        });

        it('should return 404 when transaction does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .delete(
                    `/api/shops/${shop.id}/transactions/${crypto.randomUUID()}`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Transaction not found.');
        });
    });
});

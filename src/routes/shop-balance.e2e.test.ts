import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import { shopMembersTable } from '../db/postgres/schemas/index.js';

describe('Shop Balance Routes E2E Tests (Elysia)', () => {
    const client = testClient(app);

    const createShopForUser = async (
        authUser: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Balance Test Shop',
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
                name: 'Festival Summer 2026',
                description: 'Music Festival',
                start_date: '2026-07-01T00:00:00.000Z',
                end_date: '2026-07-10T00:00:00.000Z',
                ...customEvent,
            });
        return eventRes.body;
    };

    describe('GET /api/shops/:shopId/balance', () => {
        it('should aggregate consolidated balance across transactions created by multiple members', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            // Owner creates an EARNING transaction of 500
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Ticket Sales',
                    date: '2026-07-02T10:00:00.000Z',
                    type: 'EARNING',
                    amount: 500,
                });

            // Member creates an EXPENSE transaction of 200
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', member.bearerHeader)
                .send({
                    name: 'Sound System Rental',
                    date: '2026-07-03T12:00:00.000Z',
                    type: 'EXPENSE',
                    amount: 200,
                });

            // Member creates an INVESTMENT transaction of 100
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', member.bearerHeader)
                .send({
                    name: 'Lighting Equipment Purchase',
                    date: '2026-07-04T15:00:00.000Z',
                    type: 'INVESTMENT',
                    amount: 100,
                });

            // Both owner and member can view the consolidated balance:
            // balance = earnings (500) - [expenses (200) + investments (100)] = 200
            const ownerResponse = await client
                .get(`/api/shops/${shop.id}/balance`)
                .set('Authorization', owner.bearerHeader);

            expect(ownerResponse.status).toBe(200);
            expect(Number(ownerResponse.body.earnings)).toBe(500);
            expect(Number(ownerResponse.body.expenses)).toBe(200);
            expect(Number(ownerResponse.body.investments)).toBe(100);
            expect(Number(ownerResponse.body.balance)).toBe(200);
            expect(ownerResponse.body.earningsPercentage).toBe(62);
            expect(ownerResponse.body.expensePercentage).toBe(25);
            expect(ownerResponse.body.investmentsPercentage).toBe(12);

            const memberResponse = await client
                .get(`/api/shops/${shop.id}/balance`)
                .set('Authorization', member.bearerHeader);

            expect(memberResponse.status).toBe(200);
            expect(Number(memberResponse.body.earnings)).toBe(500);
            expect(Number(memberResponse.body.expenses)).toBe(200);
            expect(Number(memberResponse.body.investments)).toBe(100);
            expect(Number(memberResponse.body.balance)).toBe(200);
        });

        it('should allow authenticating with Cookie header', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/balance`)
                .set('Cookie', owner.cookieHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('balance');
            expect(response.body).toHaveProperty('earnings');
            expect(response.body).toHaveProperty('expenses');
            expect(response.body).toHaveProperty('investments');
        });

        it('should return 0 balances and percentages when shop has no transactions', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/balance`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(Number(response.body.balance)).toBe(0);
            expect(Number(response.body.earnings)).toBe(0);
            expect(Number(response.body.expenses)).toBe(0);
            expect(Number(response.body.investments)).toBe(0);
            expect(response.body.earningsPercentage).toBe(0);
            expect(response.body.expensePercentage).toBe(0);
            expect(response.body.investmentsPercentage).toBe(0);
        });

        it('should constrain calculations by date range using from and to query params', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            // Transaction in June 2026
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Early Bird Ticket',
                    date: '2026-06-15T10:00:00.000Z',
                    type: 'EARNING',
                    amount: 300,
                });

            // Transaction in July 2026
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Regular Ticket',
                    date: '2026-07-15T10:00:00.000Z',
                    type: 'EARNING',
                    amount: 500,
                });

            // Filter for July only
            const response = await client
                .get(
                    `/api/shops/${shop.id}/balance?from=2026-07-01&to=2026-07-31`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(Number(response.body.earnings)).toBe(500);
            expect(Number(response.body.balance)).toBe(500);
        });

        it('should calculate balance for a specific event using event_id query param', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            const event1 = await createEventInShop(owner, shop.id, {
                name: 'Event 1',
            });
            const event2 = await createEventInShop(owner, shop.id, {
                name: 'Event 2',
            });

            // Transaction for Event 1
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Event 1 Earning',
                    date: '2026-07-05T10:00:00.000Z',
                    type: 'EARNING',
                    amount: 1000,
                    event_id: event1.id,
                });

            // Transaction for Event 2
            await client
                .post(`/api/shops/${shop.id}/transactions`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Event 2 Expense',
                    date: '2026-07-06T10:00:00.000Z',
                    type: 'EXPENSE',
                    amount: 400,
                    event_id: event2.id,
                });

            // Query balance for Event 1
            const resEvent1 = await client
                .get(`/api/shops/${shop.id}/balance?event_id=${event1.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(resEvent1.status).toBe(200);
            expect(Number(resEvent1.body.earnings)).toBe(1000);
            expect(Number(resEvent1.body.expenses)).toBe(0);
            expect(Number(resEvent1.body.balance)).toBe(1000);

            // Query balance for Event 2
            const resEvent2 = await client
                .get(`/api/shops/${shop.id}/balance?event_id=${event2.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(resEvent2.status).toBe(200);
            expect(Number(resEvent2.body.earnings)).toBe(0);
            expect(Number(resEvent2.body.expenses)).toBe(400);
            expect(Number(resEvent2.body.balance)).toBe(-400);
        });

        it('should return 404 when event_id does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);
            const nonExistentEventId = crypto.randomUUID();

            const response = await client
                .get(
                    `/api/shops/${shop.id}/balance?event_id=${nonExistentEventId}`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 404 when event_id belongs to a different shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShopForUser(owner1, 'Shop 1');
            const shop2 = await createShopForUser(owner2, 'Shop 2');
            const eventInShop2 = await createEventInShop(owner2, shop2.id);

            const response = await client
                .get(
                    `/api/shops/${shop1.id}/balance?event_id=${eventInShop2.id}`,
                )
                .set('Authorization', owner1.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 403 Forbidden when authenticated user is not a shop member', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/balance`)
                .set('Authorization', outsider.bearerHeader);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden');
        });

        it('should return 404 when shop does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentShopId = crypto.randomUUID();

            const response = await client
                .get(`/api/shops/${nonExistentShopId}/balance`)
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Shop not found.');
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/shops/invalid-uuid/balance')
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('The provided id is not valid.');
        });

        it('should return 400 when date query parameter is invalid', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/balance?from=not-a-date`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(400);
        });

        it('should return 400 when event_id query parameter is not a valid UUID', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShopForUser(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/balance?event_id=not-a-uuid`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(400);
        });

        it('should return 401 when unauthenticated', async () => {
            const dummyShopId = crypto.randomUUID();

            const response = await client.get(
                `/api/shops/${dummyShopId}/balance`,
            );

            expect(response.status).toBe(401);
        });
    });
});

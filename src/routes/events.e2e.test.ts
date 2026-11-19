import { describe, it, expect, mock } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import {
    account,
    user,
    shopMembersTable,
} from '../db/postgres/schemas/index.js';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

describe('Shop-Scoped Events Routes (Elysia E2E)', () => {
    const client = testClient(app);

    const createShop = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Test Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', owner.bearerHeader)
            .send({ name, description: 'Shop for event testing' });
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

    const sampleEventData = {
        name: 'Annual Tech Festival',
        description: 'A 2-day outdoor festival for tech enthusiasts',
        start_date: '2026-09-15T09:00:00.000Z',
        end_date: '2026-09-16T18:00:00.000Z',
    };

    describe('POST /api/shops/:shopId/events', () => {
        it('should return 201 when shop OWNER creates an event successfully with Bearer token', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.created_by_user_id).toBe(owner.user.id);
            expect(response.body.name).toBe(sampleEventData.name);
            expect(response.body.description).toBe(sampleEventData.description);
        });

        it('should return 201 when shop OWNER creates an event with Cookie', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Cookie', owner.cookieHeader)
                .send(sampleEventData);

            expect(response.status).toBe(201);
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.created_by_user_id).toBe(owner.user.id);
            expect(response.body.name).toBe(sampleEventData.name);
        });

        it('should return 201 when shop MEMBER creates an event and attributes created_by_user_id to the member', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', member.bearerHeader)
                .send(sampleEventData);

            expect(response.status).toBe(201);
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.created_by_user_id).toBe(member.user.id);
            expect(response.body.name).toBe(sampleEventData.name);
        });

        it('should create an event with explicit tag and return it', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    tag: 'business',
                });

            expect(response.status).toBe(201);
            expect(response.body.tag).toBe('business');
        });

        it('should default all_day to false when omitted', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            expect(response.status).toBe(201);
            expect(response.body.all_day).toBe(false);
        });

        it('should create an All-Day Event with all_day: true and normalized UTC civil-date bounds', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Holiday All-Day',
                    description: 'Full civil day event',
                    start_date: '2026-11-18T00:00:00-03:00',
                    end_date: '2026-11-18T23:59:59-03:00',
                    all_day: true,
                });

            expect(response.status).toBe(201);
            expect(response.body.all_day).toBe(true);
            expect(response.body.start_date).toBe('2026-11-18T00:00:00.000Z');
            expect(response.body.end_date).toBe('2026-11-18T23:59:59.000Z');
        });

        it('should create a Timed Event spanning 00:00-23:59 with all_day: false', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: '24h Shift Timed Event',
                    start_date: '2026-11-18T00:00:00.000Z',
                    end_date: '2026-11-18T23:59:59.000Z',
                    all_day: false,
                });

            expect(response.status).toBe(201);
            expect(response.body.all_day).toBe(false);
            expect(response.body.start_date).toBe('2026-11-18T00:00:00.000Z');
            expect(response.body.end_date).toBe('2026-11-18T23:59:59.000Z');
        });

        it('should return 400 when all_day is true and end_date civil day is before start_date', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Invalid Range All-Day',
                    start_date: '2026-11-18',
                    end_date: '2026-11-17',
                    all_day: true,
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'End date must be greater than or equal to start date.',
            );
        });

        it('should default event tag to null when tag is omitted or null', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const responseWithoutTag = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            expect(responseWithoutTag.status).toBe(201);
            expect(responseWithoutTag.body.tag).toBeNull();

            const responseWithNullTag = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    tag: null,
                });

            expect(responseWithNullTag.status).toBe(201);
            expect(responseWithNullTag.body.tag).toBeNull();
        });

        it('should return 401 when unauthorized', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .send(sampleEventData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 401 when token is invalid', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', 'Bearer invalid_token')
                .send(sampleEventData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', nonMember.bearerHeader)
                .send(sampleEventData);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 404 when shop does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonExistentShopId = faker.string.uuid();

            const response = await client
                .post(`/api/shops/${nonExistentShopId}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ message: 'Shop not found.' });
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops/not-a-uuid/events')
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            expect(response.status).toBe(400);
        });

        it('should return 400 when invalid body (empty name)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: '',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Name is required.');
        });

        it('should return 400 when end_date is before start_date', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    start_date: '2026-05-10T00:00:00.000Z',
                    end_date: '2026-05-01T00:00:00.000Z',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'End date must be greater than or equal to start date.',
            );
        });

        it('should return 400 when start_date is invalid', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    start_date: 'invalid-date',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Start date must be a valid date.',
            );
        });

        it('should return 400 for non-existent calendar dates like 2026-02-30 instead of rolling over', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const timedResponse = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Impossible Timed Date',
                    start_date: '2026-02-30T10:00:00Z',
                    end_date: '2026-03-02T12:00:00Z',
                });

            expect(timedResponse.status).toBe(400);
            expect(timedResponse.body.message).toBe(
                'Start date must be a valid date.',
            );

            const allDayResponse = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Impossible All-Day Date',
                    start_date: '2026-02-15',
                    end_date: '2026-04-31',
                    all_day: true,
                });

            expect(allDayResponse.status).toBe(400);
            expect(allDayResponse.body.message).toBe(
                'End date must be a valid date.',
            );
        });

        it('should export event to Google Calendar and persist google_event_id when sync is enabled', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await db
                .update(user)
                .set({ google_calendar_sync_enabled: true })
                .where(eq(user.id, owner.user.id));

            await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: 'google-sub-12345',
                providerId: 'google',
                userId: owner.user.id,
                accessToken: 'valid-google-access-token',
                refreshToken: 'valid-google-refresh-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const originalFetch = globalThis.fetch;
            const mockFetch = mock(async (url: string | URL | Request) => {
                const urlStr = url.toString();
                if (
                    urlStr.includes(
                        'googleapis.com/calendar/v3/calendars/primary/events',
                    )
                ) {
                    return new Response(
                        JSON.stringify({
                            id: 'gcal-event-999',
                            summary: sampleEventData.name,
                            status: 'confirmed',
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    );
                }
                return originalFetch(url);
            });
            globalThis.fetch = mockFetch as any;

            try {
                const response = await client
                    .post(`/api/shops/${shop.id}/events`)
                    .set('Authorization', owner.bearerHeader)
                    .send(sampleEventData);

                expect(response.status).toBe(201);
                expect(response.body.google_event_id).toBe('gcal-event-999');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should bypass Google Calendar export when sync is disabled', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            let fetchCalled = false;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async (url: string | URL | Request) => {
                const urlStr = url.toString();
                if (
                    urlStr.includes(
                        'googleapis.com/calendar/v3/calendars/primary/events',
                    )
                ) {
                    fetchCalled = true;
                }
                return originalFetch(url);
            }) as any;

            try {
                const response = await client
                    .post(`/api/shops/${shop.id}/events`)
                    .set('Authorization', owner.bearerHeader)
                    .send(sampleEventData);

                expect(response.status).toBe(201);
                expect(fetchCalled).toBe(false);
                expect(response.body.google_event_id).toBeNull();
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should return 201 when Google Calendar API fails (non-blocking resilience)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await db
                .update(user)
                .set({ google_calendar_sync_enabled: true })
                .where(eq(user.id, owner.user.id));

            await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: 'google-sub-fail',
                providerId: 'google',
                userId: owner.user.id,
                accessToken: 'valid-google-access-token',
                refreshToken: 'valid-google-refresh-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async (url: string | URL | Request) => {
                const urlStr = url.toString();
                if (
                    urlStr.includes(
                        'googleapis.com/calendar/v3/calendars/primary/events',
                    )
                ) {
                    return new Response(
                        JSON.stringify({
                            error: { message: 'Internal Calendar Error' },
                        }),
                        { status: 500 },
                    );
                }
                return originalFetch(url);
            }) as any;

            try {
                const response = await client
                    .post(`/api/shops/${shop.id}/events`)
                    .set('Authorization', owner.bearerHeader)
                    .send(sampleEventData);

                expect(response.status).toBe(201);
                expect(response.body.name).toBe(sampleEventData.name);
                expect(response.body.google_event_id).toBeNull();
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('GET /api/shops/:shopId/events', () => {
        it('should return 200 with shop events for OWNER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const response = await client
                .get(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe(sampleEventData.name);
            expect(response.body[0].shop_id).toBe(shop.id);
        });

        it('should return events containing their tag property (both custom and default null)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Create event with custom tag
            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Custom Tag Event',
                    tag: 'business',
                });

            // Create event without tag (should default to null)
            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Default Tag Event',
                });

            const response = await client
                .get(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);

            const customEvent = response.body.find(
                (e: any) => e.name === 'Custom Tag Event',
            );
            const defaultEvent = response.body.find(
                (e: any) => e.name === 'Default Tag Event',
            );

            expect(customEvent).toBeDefined();
            expect(customEvent.tag).toBe('business');

            expect(defaultEvent).toBeDefined();
            expect(defaultEvent.tag).toBeNull();
        });

        it('should return events containing explicit all_day boolean for both All-Day and Timed Events', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'All-Day Event',
                    start_date: '2026-11-18',
                    end_date: '2026-11-18',
                    all_day: true,
                });

            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Timed Event',
                    all_day: false,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);

            const allDayEvt = response.body.find(
                (e: any) => e.name === 'All-Day Event',
            );
            const timedEvt = response.body.find(
                (e: any) => e.name === 'Timed Event',
            );

            expect(allDayEvt.all_day).toBe(true);
            expect(allDayEvt.start_date).toBe('2026-11-18T00:00:00.000Z');
            expect(allDayEvt.end_date).toBe('2026-11-18T23:59:59.000Z');
            expect(timedEvt.all_day).toBe(false);
        });

        it('should return 200 with all shop events for MEMBER (including events created by OWNER)', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            // Owner creates event 1
            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Owner Event',
                });

            // Member creates event 2
            await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', member.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Member Event',
                });

            const response = await client
                .get(`/api/shops/${shop.id}/events`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
            const names = response.body.map((e: any) => e.name);
            expect(names).toContain('Owner Event');
            expect(names).toContain('Member Event');

            const ownerEvent = response.body.find(
                (e: any) => e.name === 'Owner Event',
            );
            const memberEvent = response.body.find(
                (e: any) => e.name === 'Member Event',
            );
            expect(ownerEvent.author).toEqual({
                id: owner.user.id,
                name: owner.user.name,
                first_name: owner.user.first_name,
                last_name: owner.user.last_name,
                email: owner.user.email,
                image: null,
            });
            expect(memberEvent.author).toEqual({
                id: member.user.id,
                name: member.user.name,
                first_name: member.user.first_name,
                last_name: member.user.last_name,
                email: member.user.email,
                image: null,
            });
        });

        it('should not return events from other shops (tenant isolation)', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop One');
            const shop2 = await createShop(owner2, 'Shop Two');

            await client
                .post(`/api/shops/${shop1.id}/events`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Shop 1 Event',
                });

            await client
                .post(`/api/shops/${shop2.id}/events`)
                .set('Authorization', owner2.bearerHeader)
                .send({
                    ...sampleEventData,
                    name: 'Shop 2 Event',
                });

            const response = await client
                .get(`/api/shops/${shop1.id}/events`)
                .set('Authorization', owner1.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Shop 1 Event');
        });

        it('should return 401 when unauthorized', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client.get(`/api/shops/${shop.id}/events`);
            expect(response.status).toBe(401);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/events`)
                .set('Authorization', nonMember.bearerHeader);

            expect(response.status).toBe(403);
        });

        it('should return 404 when shop does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonExistentId = faker.string.uuid();

            const response = await client
                .get(`/api/shops/${nonExistentId}/events`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/shops/:shopId/events/:id', () => {
        it('should return 200 when OWNER retrieves event by id', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(eventId);
            expect(response.body.name).toBe(sampleEventData.name);
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.all_day).toBe(false);
        });

        it('should return 200 with all_day: true when retrieving an All-Day Event by id', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Single All-Day Event',
                    start_date: '2026-11-18T00:00:00-03:00',
                    end_date: '2026-11-18T23:59:59-03:00',
                    all_day: true,
                });

            const eventId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(eventId);
            expect(response.body.all_day).toBe(true);
            expect(response.body.start_date).toBe('2026-11-18T00:00:00.000Z');
            expect(response.body.end_date).toBe('2026-11-18T23:59:59.000Z');
        });

        it('should return 200 when MEMBER retrieves event created by OWNER', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(eventId);
            expect(response.body.name).toBe(sampleEventData.name);
        });

        it('should return 404 when event belongs to a different shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop One');
            const shop2 = await createShop(owner2, 'Shop Two');

            const createRes = await client
                .post(`/api/shops/${shop1.id}/events`)
                .set('Authorization', owner1.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            // Try to access shop1's event via shop2's URL
            const response = await client
                .get(`/api/shops/${shop2.id}/events/${eventId}`)
                .set('Authorization', owner2.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', nonMember.bearerHeader);

            expect(response.status).toBe(403);
        });

        it('should return 404 when event does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const nonExistentEventId = faker.string.uuid();

            const response = await client
                .get(`/api/shops/${shop.id}/events/${nonExistentEventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 400 when eventId is not a valid UUID', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/events/not-a-uuid`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /api/shops/:shopId/events/:id', () => {
        it('should return 200 when OWNER updates event', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Updated Festival Name',
                });

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Updated Festival Name');
        });

        it('should return 200 when MEMBER updates event (collaborative tenancy)', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', member.bearerHeader)
                .send({
                    name: 'Member Updated Name',
                });

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Member Updated Name');
        });

        it('should return 200 and update event tag', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    tag: 'business',
                });

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    tag: 'personal',
                });

            expect(response.status).toBe(200);
            expect(response.body.tag).toBe('personal');

            const getRes = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.tag).toBe('personal');
        });

        it('should return 200 and clear event tag when updating tag to null', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    ...sampleEventData,
                    tag: 'business',
                });

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    tag: null,
                });

            expect(response.status).toBe(200);
            expect(response.body.tag).toBeNull();

            const getRes = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.tag).toBeNull();
        });

        it('should return 403 when non-member tries to update event', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', nonMember.bearerHeader)
                .send({
                    name: 'Malicious Update',
                });

            expect(response.status).toBe(403);
        });

        it('should return 404 when updating event that belongs to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop One');
            const shop2 = await createShop(owner2, 'Shop Two');

            const createRes = await client
                .post(`/api/shops/${shop1.id}/events`)
                .set('Authorization', owner1.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop2.id}/events/${eventId}`)
                .set('Authorization', owner2.bearerHeader)
                .send({
                    name: 'Cross Shop Update',
                });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 400 when end_date is before start_date on update', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    start_date: '2026-10-10T00:00:00.000Z',
                    end_date: '2026-10-01T00:00:00.000Z',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'End date must be greater than or equal to start date.',
            );
        });

        it('should return 200 and switch a Timed Event to all_day: true (with and without new dates)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Timed to All-Day',
                    start_date: '2026-11-18T14:00:00.000Z',
                    end_date: '2026-11-18T16:00:00.000Z',
                    all_day: false,
                });

            const eventId = createRes.body.id;

            // Switch to all_day: true without sending new dates
            const switchOnlyRes = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({ all_day: true });

            expect(switchOnlyRes.status).toBe(200);
            expect(switchOnlyRes.body.all_day).toBe(true);
            expect(switchOnlyRes.body.start_date).toBe(
                '2026-11-18T00:00:00.000Z',
            );
            expect(switchOnlyRes.body.end_date).toBe(
                '2026-11-18T23:59:59.000Z',
            );

            // Update dates with local offset while switching/keeping all_day: true
            const withDatesRes = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    all_day: true,
                    start_date: '2026-11-20T00:00:00-03:00',
                    end_date: '2026-11-21T23:59:59-03:00',
                });

            expect(withDatesRes.status).toBe(200);
            expect(withDatesRes.body.all_day).toBe(true);
            expect(withDatesRes.body.start_date).toBe(
                '2026-11-20T00:00:00.000Z',
            );
            expect(withDatesRes.body.end_date).toBe('2026-11-21T23:59:59.000Z');

            const getRes = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.all_day).toBe(true);
            expect(getRes.body.start_date).toBe('2026-11-20T00:00:00.000Z');
            expect(getRes.body.end_date).toBe('2026-11-21T23:59:59.000Z');
        });

        it('should return 200 and switch an All-Day Event to all_day: false (with and without new dates)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'All-Day to Timed',
                    start_date: '2026-11-18',
                    end_date: '2026-11-18',
                    all_day: true,
                });

            const eventId = createRes.body.id;

            // Switch to all_day: false with explicit timed instants
            const withTimedDatesRes = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    all_day: false,
                    start_date: '2026-11-18T14:00:00-03:00',
                    end_date: '2026-11-18T16:00:00-03:00',
                });

            expect(withTimedDatesRes.status).toBe(200);
            expect(withTimedDatesRes.body.all_day).toBe(false);
            expect(withTimedDatesRes.body.start_date).toBe(
                '2026-11-18T17:00:00.000Z',
            );
            expect(withTimedDatesRes.body.end_date).toBe(
                '2026-11-18T19:00:00.000Z',
            );

            // Switch back to all_day: true, then switch to all_day: false without dates
            await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({ all_day: true });

            const switchOnlyRes = await client
                .patch(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader)
                .send({ all_day: false });

            expect(switchOnlyRes.status).toBe(200);
            expect(switchOnlyRes.body.all_day).toBe(false);

            const getRes = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.all_day).toBe(false);
        });

        it('should return 400 when all_day is true and end_date civil day is before start_date on update', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    all_day: true,
                    start_date: '2026-11-18',
                    end_date: '2026-11-17',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'End date must be greater than or equal to start date.',
            );
        });

        it('should return 400 when updating only start_date after existing end_date', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Single-Day All-Day',
                    start_date: '2026-11-18',
                    end_date: '2026-11-18',
                    all_day: true,
                });

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    start_date: '2026-11-20',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'End date must be greater than or equal to start date.',
            );
        });

        it('should return 200 for valid same-day offset update on existing All-Day Event when all_day is omitted', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Existing All-Day Event',
                    start_date: '2026-11-17',
                    end_date: '2026-11-17',
                    all_day: true,
                });

            expect(createRes.status).toBe(201);

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    start_date: '2026-11-18T22:00:00-03:00',
                    end_date: '2026-11-18T10:00:00Z',
                });

            expect(response.status).toBe(200);
            expect(response.body.all_day).toBe(true);
            expect(response.body.start_date).toBe('2026-11-18T00:00:00.000Z');
            expect(response.body.end_date).toBe('2026-11-18T23:59:59.000Z');
        });

        it('should return 400 when updating event with a non-existent calendar date like 2026-02-30', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    start_date: '2026-02-30',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Start date must be a valid date.',
            );
        });

        it('should return 403 when non-member tries to update all_day', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const response = await client
                .patch(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                .set('Authorization', nonMember.bearerHeader)
                .send({ all_day: true });

            expect(response.status).toBe(403);
        });

        it('should patch Google Calendar event when sync is enabled and event has google_event_id', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await db
                .update(user)
                .set({ google_calendar_sync_enabled: true })
                .where(eq(user.id, owner.user.id));

            await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: 'google-sub-patch',
                providerId: 'google',
                userId: owner.user.id,
                accessToken: 'valid-google-access-token',
                refreshToken: 'valid-google-refresh-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const originalFetch = globalThis.fetch;
            let patched = false;
            globalThis.fetch = (async (
                url: string | URL | Request,
                init?: RequestInit,
            ) => {
                const urlStr = url.toString();
                if (
                    urlStr.includes(
                        'googleapis.com/calendar/v3/calendars/primary/events',
                    )
                ) {
                    if (init?.method === 'PATCH') {
                        patched = true;
                    }
                    return new Response(
                        JSON.stringify({
                            id: 'gcal-event-patch',
                            summary: 'Updated Summary',
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    );
                }
                return originalFetch(url, init);
            }) as any;

            try {
                // First create an event with google_event_id
                const createRes = await client
                    .post(`/api/shops/${shop.id}/events`)
                    .set('Authorization', owner.bearerHeader)
                    .send(sampleEventData);

                const eventId = createRes.body.id;

                const response = await client
                    .patch(`/api/shops/${shop.id}/events/${eventId}`)
                    .set('Authorization', owner.bearerHeader)
                    .send({
                        name: 'Updated Summary',
                    });

                expect(response.status).toBe(200);
                expect(patched).toBe(true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('DELETE /api/shops/:shopId/events/:id', () => {
        it('should return 200 when OWNER deletes event', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .delete(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(eventId);

            // Verify it cannot be fetched anymore
            const getRes = await client
                .get(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', owner.bearerHeader);
            expect(getRes.status).toBe(404);
        });

        it('should return 200 when MEMBER deletes event (collaborative tenancy)', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .delete(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(eventId);
        });

        it('should return 403 when non-member tries to delete event', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .delete(`/api/shops/${shop.id}/events/${eventId}`)
                .set('Authorization', nonMember.bearerHeader);

            expect(response.status).toBe(403);
        });

        it('should return 404 when deleting event from a different shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop One');
            const shop2 = await createShop(owner2, 'Shop Two');

            const createRes = await client
                .post(`/api/shops/${shop1.id}/events`)
                .set('Authorization', owner1.bearerHeader)
                .send(sampleEventData);

            const eventId = createRes.body.id;

            const response = await client
                .delete(`/api/shops/${shop2.id}/events/${eventId}`)
                .set('Authorization', owner2.bearerHeader);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should delete Google Calendar event when sync is enabled and event has google_event_id', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await db
                .update(user)
                .set({ google_calendar_sync_enabled: true })
                .where(eq(user.id, owner.user.id));

            await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: 'google-sub-del',
                providerId: 'google',
                userId: owner.user.id,
                accessToken: 'valid-google-access-token',
                refreshToken: 'valid-google-refresh-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const originalFetch = globalThis.fetch;
            let deleted = false;
            globalThis.fetch = (async (
                url: string | URL | Request,
                init?: RequestInit,
            ) => {
                const urlStr = url.toString();
                if (
                    urlStr.includes(
                        'googleapis.com/calendar/v3/calendars/primary/events',
                    )
                ) {
                    if (init?.method === 'DELETE') {
                        deleted = true;
                        return new Response(null, { status: 204 });
                    }
                    return new Response(
                        JSON.stringify({ id: 'gcal-del-123' }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    );
                }
                return originalFetch(url, init);
            }) as any;

            try {
                const createRes = await client
                    .post(`/api/shops/${shop.id}/events`)
                    .set('Authorization', owner.bearerHeader)
                    .send(sampleEventData);

                const eventId = createRes.body.id;

                const response = await client
                    .delete(`/api/shops/${shop.id}/events/${eventId}`)
                    .set('Authorization', owner.bearerHeader);

                expect(response.status).toBe(200);
                expect(deleted).toBe(true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('Centralized Shop OWNER Google Calendar Sync (E2E)', () => {
        it('should sync MEMBER create, update (with 404 fallback insert), and delete against Shop OWNER Google account', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            await db
                .update(user)
                .set({ google_calendar_sync_enabled: true })
                .where(eq(user.id, owner.user.id));

            await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: 'google-sub-owner-central',
                providerId: 'google',
                userId: owner.user.id,
                accessToken: 'owner-central-token',
                refreshToken: 'owner-central-refresh',
                accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const calls: Array<{ method: string; auth: string }> = [];
            let insertCount = 0;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async (
                url: string | URL | Request,
                init?: RequestInit,
            ) => {
                const urlStr = url.toString();
                if (
                    urlStr.includes(
                        'googleapis.com/calendar/v3/calendars/primary/events',
                    )
                ) {
                    const headers = (init?.headers ?? {}) as Record<
                        string,
                        string
                    >;
                    const method = init?.method ?? 'GET';
                    calls.push({ method, auth: headers['Authorization'] });

                    if (method === 'POST') {
                        insertCount += 1;
                        return new Response(
                            JSON.stringify({
                                id: `gcal-central-${insertCount}`,
                            }),
                            {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' },
                            },
                        );
                    }
                    if (method === 'PATCH') {
                        return new Response('Not Found', { status: 404 });
                    }
                    if (method === 'DELETE') {
                        return new Response(null, { status: 204 });
                    }
                }
                return originalFetch(url, init);
            }) as any;

            try {
                // 1. MEMBER creates event -> inserts on OWNER Google Calendar
                const createRes = await client
                    .post(`/api/shops/${shop.id}/events`)
                    .set('Authorization', member.bearerHeader)
                    .send(sampleEventData);

                expect(createRes.status).toBe(201);
                expect(createRes.body.google_event_id).toBe('gcal-central-1');
                expect(createRes.body.created_by_user_id).toBe(member.user.id);

                // 2. MEMBER updates event -> PATCH returns 404 -> falls back to POST and persists new google_event_id
                const patchRes = await client
                    .patch(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                    .set('Authorization', member.bearerHeader)
                    .send({ name: 'Updated by Member' });

                expect(patchRes.status).toBe(200);
                expect(patchRes.body.google_event_id).toBe('gcal-central-2');

                // 3. MEMBER deletes event -> deletes from OWNER Google Calendar
                const deleteRes = await client
                    .delete(`/api/shops/${shop.id}/events/${createRes.body.id}`)
                    .set('Authorization', member.bearerHeader);

                expect(deleteRes.status).toBe(200);
                expect(calls).toEqual([
                    { method: 'POST', auth: 'Bearer owner-central-token' },
                    { method: 'PATCH', auth: 'Bearer owner-central-token' },
                    { method: 'POST', auth: 'Bearer owner-central-token' },
                    { method: 'DELETE', auth: 'Bearer owner-central-token' },
                ]);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
});

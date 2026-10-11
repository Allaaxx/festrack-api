import { describe, it, expect, mock } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { event } from '../tests/index.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import { account, user } from '../db/postgres/schemas/index.js';
import { eq } from 'drizzle-orm';

describe('Events Routes (Elysia E2E)', () => {
    const client = testClient(app);

    it('POST /api/events/me should return 201 when creating an event successfully with Bearer token', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(event.name);
        expect(response.body.user_id).toBe(authUser.user.id);
    });

    it('POST /api/events/me should return 201 when creating an event with Cookie', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Cookie', authUser.cookieHeader)
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(event.name);
        expect(response.body.user_id).toBe(authUser.user.id);
    });

    it('POST /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.post('/api/events/me').send({
            ...event,
            id: undefined,
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/events/me should return 401 when token is invalid', async () => {
        const response = await client
            .post('/api/events/me')
            .set('Authorization', 'Bearer invalid_token')
            .send({
                ...event,
                id: undefined,
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('POST /api/events/me should return 400 when invalid body', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
                name: '',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Name is required.');
    });

    it('POST /api/events/me should return 400 when end_date is before start_date', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
                start_date: '2026-05-10',
                end_date: '2026-05-01',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            'End date must be greater than or equal to start date.',
        );
    });

    it('POST /api/events/me should export event to Google Calendar and persist google_event_id when sync is enabled', async () => {
        const authUser = await createAuthenticatedUser(client);

        // Enable sync on user
        await db
            .update(user)
            .set({ google_calendar_sync_enabled: true })
            .where(eq(user.id, authUser.user.id));

        // Add linked Google account
        await db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authUser.user.id,
            providerId: 'google',
            accountId: `google_${Date.now()}`,
            accessToken: 'valid-google-token',
            accessTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        const originalFetch = globalThis.fetch;
        let exportCalled = false;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    exportCalled = true;
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({ id: 'g-event-created-123' }),
                            {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' },
                            },
                        ),
                    );
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const response = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            expect(response.status).toBe(201);
            expect(response.body.google_event_id).toBe('g-event-created-123');
            expect(exportCalled).toBe(true);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('POST /api/events/me should bypass Google Calendar export when sync is disabled', async () => {
        const authUser = await createAuthenticatedUser(client);

        // Sync is disabled by default
        const originalFetch = globalThis.fetch;
        let exportCalled = false;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    exportCalled = true;
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const response = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            expect(response.status).toBe(201);
            expect(response.body.google_event_id).toBeNull();
            expect(exportCalled).toBe(false);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('POST /api/events/me should return 201 when Google Calendar API fails (non-blocking resilience)', async () => {
        const authUser = await createAuthenticatedUser(client);

        // Enable sync on user
        await db
            .update(user)
            .set({ google_calendar_sync_enabled: true })
            .where(eq(user.id, authUser.user.id));

        // Add linked Google account
        await db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authUser.user.id,
            providerId: 'google',
            accountId: `google_${Date.now()}`,
            accessToken: 'valid-google-token',
            accessTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({ error: 'Server Error' }),
                            {
                                status: 500,
                            },
                        ),
                    );
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const response = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            // Non-blocking: event is still created in Festrack with status 201
            expect(response.status).toBe(201);
            expect(response.body.name).toBe(event.name);
            expect(response.body.google_event_id).toBeNull();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('GET /api/events/me should return 200 with user events using Bearer token', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/events/me')
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].id).toBe(createdEvent.id);
    });

    it('GET /api/events/me should return 200 with user events using Cookie', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Cookie', authUser.cookieHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get('/api/events/me')
            .set('Cookie', authUser.cookieHeader);

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].id).toBe(createdEvent.id);
    });

    it('GET /api/events/me should return 401 when unauthorized', async () => {
        const response = await client.get('/api/events/me');
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('GET /api/events/me/:eventId should return 200 when fetching event by id', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
    });

    it('GET /api/events/me/:eventId should return 400 when eventId is invalid UUID', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get('/api/events/me/not-a-valid-uuid')
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('GET /api/events/me/:eventId should return 404 when event does not exist', async () => {
        const authUser = await createAuthenticatedUser(client);

        const response = await client
            .get(`/api/events/me/${crypto.randomUUID()}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Event not found.' });
    });

    it('GET /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const userA = await createAuthenticatedUser(client);
        const userB = await createAuthenticatedUser(client);

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', userA.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .get(`/api/events/me/${eventA.id}`)
            .set('Authorization', userB.bearerHeader);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('PATCH /api/events/me/:eventId should return 200 when updating event successfully', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', authUser.bearerHeader)
            .send({
                name: 'Updated Event Name',
            });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Event Name');
    });

    it('PATCH /api/events/me/:eventId should patch Google Calendar event when sync is enabled and event has google_event_id', async () => {
        const authUser = await createAuthenticatedUser(client);

        await db
            .update(user)
            .set({ google_calendar_sync_enabled: true })
            .where(eq(user.id, authUser.user.id));

        await db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authUser.user.id,
            providerId: 'google',
            accountId: `google_${Date.now()}`,
            accessToken: 'valid-google-token',
            accessTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        const originalFetch = globalThis.fetch;
        let patchCalled = false;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    if (init?.method === 'POST') {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'g-event-patch-target' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    if (init?.method === 'PATCH') {
                        patchCalled = true;
                        return Promise.resolve(
                            new Response('{}', { status: 200 }),
                        );
                    }
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const { body: createdEvent } = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            expect(createdEvent.google_event_id).toBe('g-event-patch-target');

            const patchRes = await client
                .patch(`/api/events/me/${createdEvent.id}`)
                .set('Authorization', authUser.bearerHeader)
                .send({
                    name: 'Patched Festival',
                });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.name).toBe('Patched Festival');
            expect(patchCalled).toBe(true);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('PATCH /api/events/me/:eventId should return 200 when Google Calendar patch fails (non-blocking resilience)', async () => {
        const authUser = await createAuthenticatedUser(client);

        await db
            .update(user)
            .set({ google_calendar_sync_enabled: true })
            .where(eq(user.id, authUser.user.id));

        await db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authUser.user.id,
            providerId: 'google',
            accountId: `google_${Date.now()}`,
            accessToken: 'valid-google-token',
            accessTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    if (init?.method === 'POST') {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'g-event-patch-err' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    if (init?.method === 'PATCH') {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({
                                    error: 'Service Unavailable',
                                }),
                                {
                                    status: 503,
                                },
                            ),
                        );
                    }
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const { body: createdEvent } = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            const patchRes = await client
                .patch(`/api/events/me/${createdEvent.id}`)
                .set('Authorization', authUser.bearerHeader)
                .send({
                    name: 'Updated Despite Google 503',
                });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.name).toBe('Updated Despite Google 503');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('PATCH /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const userA = await createAuthenticatedUser(client);
        const userB = await createAuthenticatedUser(client);

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', userA.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .patch(`/api/events/me/${eventA.id}`)
            .set('Authorization', userB.bearerHeader)
            .send({
                name: 'Unauthorized update attempt',
            });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('DELETE /api/events/me/:eventId should return 200 when deleting event successfully', async () => {
        const authUser = await createAuthenticatedUser(client);

        const { body: createdEvent } = await client
            .post('/api/events/me')
            .set('Authorization', authUser.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${createdEvent.id}`)
            .set('Authorization', authUser.bearerHeader);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(createdEvent.id);
    });

    it('DELETE /api/events/me/:eventId should delete Google Calendar event when sync is enabled and event has google_event_id', async () => {
        const authUser = await createAuthenticatedUser(client);

        await db
            .update(user)
            .set({ google_calendar_sync_enabled: true })
            .where(eq(user.id, authUser.user.id));

        await db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authUser.user.id,
            providerId: 'google',
            accountId: `google_${Date.now()}`,
            accessToken: 'valid-google-token',
            accessTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        const originalFetch = globalThis.fetch;
        let deleteCalled = false;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    if (init?.method === 'POST') {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'g-event-delete-target' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    if (init?.method === 'DELETE') {
                        deleteCalled = true;
                        return Promise.resolve(
                            new Response(null, { status: 204 }),
                        );
                    }
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const { body: createdEvent } = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            expect(createdEvent.google_event_id).toBe('g-event-delete-target');

            const deleteRes = await client
                .delete(`/api/events/me/${createdEvent.id}`)
                .set('Authorization', authUser.bearerHeader);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.id).toBe(createdEvent.id);
            expect(deleteCalled).toBe(true);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('DELETE /api/events/me/:eventId should return 200 when Google Calendar delete fails (non-blocking resilience)', async () => {
        const authUser = await createAuthenticatedUser(client);

        await db
            .update(user)
            .set({ google_calendar_sync_enabled: true })
            .where(eq(user.id, authUser.user.id));

        await db.insert(account).values({
            id: crypto.randomUUID(),
            userId: authUser.user.id,
            providerId: 'google',
            accountId: `google_${Date.now()}`,
            accessToken: 'valid-google-token',
            accessTokenExpiresAt: new Date(Date.now() + 3600000),
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(
            (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                if (urlStr.includes('/calendars/primary/events')) {
                    if (init?.method === 'POST') {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'g-event-delete-err' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    if (init?.method === 'DELETE') {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ error: 'Server Error' }),
                                {
                                    status: 500,
                                },
                            ),
                        );
                    }
                }
                return originalFetch(url, init);
            },
        ) as any;

        try {
            const { body: createdEvent } = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    ...event,
                    id: undefined,
                });

            const deleteRes = await client
                .delete(`/api/events/me/${createdEvent.id}`)
                .set('Authorization', authUser.bearerHeader);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.id).toBe(createdEvent.id);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('DELETE /api/events/me/:eventId should return 403 when event belongs to another user', async () => {
        const userA = await createAuthenticatedUser(client);
        const userB = await createAuthenticatedUser(client);

        const { body: eventA } = await client
            .post('/api/events/me')
            .set('Authorization', userA.bearerHeader)
            .send({
                ...event,
                id: undefined,
            });

        const response = await client
            .delete(`/api/events/me/${eventA.id}`)
            .set('Authorization', userB.bearerHeader);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Forbidden' });
    });
});

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DefaultGoogleCalendarAdapter } from './google-calendar-adapter.js';
import { GoogleCalendarNotFoundError } from '../errors/index.js';
import { db } from '../db/postgres/index.js';
import { account, user } from '../db/postgres/schemas/index.js';
import { eq } from 'drizzle-orm';

describe('DefaultGoogleCalendarAdapter', () => {
    let adapter: DefaultGoogleCalendarAdapter;
    let testUserId: string;

    beforeEach(async () => {
        testUserId = crypto.randomUUID();
        // Insert user
        await db.insert(user).values({
            id: testUserId,
            name: 'Test Calendar User',
            email: `calendar_${Date.now()}@example.com`,
            first_name: 'Calendar',
            last_name: 'User',
            google_calendar_sync_enabled: true,
        });

        adapter = new DefaultGoogleCalendarAdapter({
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            calendarBaseUrl: 'https://mock-calendar.example.com',
            oauthTokenUrl: 'https://mock-oauth.example.com/token',
        });
    });

    describe('insert', () => {
        it('should return null if user has no Google account linked', async () => {
            const result = await adapter.insert(testUserId, {
                name: 'Event without Google',
                start_date: new Date(),
                end_date: new Date(),
            });

            expect(result).toBeNull();
        });

        it('should insert event to Google Calendar and return google event id', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-1',
                accessToken: 'valid-access-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/calendars/primary/events')) {
                        const headers = init?.headers as Record<string, string>;
                        expect(headers['Authorization']).toBe(
                            'Bearer valid-access-token',
                        );
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'google-event-xyz' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                const result = await adapter.insert(testUserId, {
                    name: 'Synced Party',
                    description: 'Fun event',
                    start_date: '2026-10-20T10:00:00.000Z',
                    end_date: '2026-10-20T12:00:00.000Z',
                });

                expect(result).toBe('google-event-xyz');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should preserve timezone offset in dateTime and include timeZone defaulting to America/Sao_Paulo', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-tz-1',
                accessToken: 'valid-access-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            let capturedBody: Record<string, unknown> | null = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/calendars/primary/events')) {
                        capturedBody = JSON.parse(init?.body as string);
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'google-event-tz' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                await adapter.insert(testUserId, {
                    name: 'Local Time Event',
                    start_date: '2026-10-20T14:00:00-03:00',
                    end_date: '2026-10-20T18:00:00-03:00',
                });

                expect(capturedBody).not.toBeNull();
                expect(capturedBody!.start).toEqual({
                    dateTime: '2026-10-20T14:00:00-03:00',
                    timeZone: 'America/Sao_Paulo',
                });
                expect(capturedBody!.end).toEqual({
                    dateTime: '2026-10-20T18:00:00-03:00',
                    timeZone: 'America/Sao_Paulo',
                });
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should use explicit timeZone when provided on insert', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-tz-2',
                accessToken: 'valid-access-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            let capturedBody: Record<string, unknown> | null = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/calendars/primary/events')) {
                        capturedBody = JSON.parse(init?.body as string);
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'google-event-ny' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                await adapter.insert(testUserId, {
                    name: 'NY Event',
                    start_date: '2026-10-20T14:00:00-04:00',
                    end_date: '2026-10-20T16:00:00-04:00',
                    timeZone: 'America/New_York',
                });

                expect(capturedBody!.start).toEqual({
                    dateTime: '2026-10-20T14:00:00-04:00',
                    timeZone: 'America/New_York',
                });
                expect(capturedBody!.end).toEqual({
                    dateTime: '2026-10-20T16:00:00-04:00',
                    timeZone: 'America/New_York',
                });
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should automatically refresh expired access token and persist new token before inserting', async () => {
            const accountId = crypto.randomUUID();
            await db.insert(account).values({
                id: accountId,
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-2',
                accessToken: 'expired-access-token',
                accessTokenExpiresAt: new Date(Date.now() - 10000), // expired
                refreshToken: 'valid-refresh-token',
            });

            let tokenRefreshed = false;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/token')) {
                        tokenRefreshed = true;
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({
                                    access_token: 'fresh-access-token',
                                    expires_in: 3600,
                                }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    if (urlStr.includes('/calendars/primary/events')) {
                        const headers = init?.headers as Record<string, string>;
                        expect(headers['Authorization']).toBe(
                            'Bearer fresh-access-token',
                        );
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'google-event-fresh' }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                const result = await adapter.insert(testUserId, {
                    name: 'Fresh Token Event',
                    start_date: new Date(),
                    end_date: new Date(),
                });

                expect(result).toBe('google-event-fresh');
                expect(tokenRefreshed).toBe(true);

                // Verify updated in DB
                const [accInDb] = await db
                    .select()
                    .from(account)
                    .where(eq(account.id, accountId));
                expect(accInDb.accessToken).toBe('fresh-access-token');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should refresh token and retry if Google returns 401', async () => {
            const accountId = crypto.randomUUID();
            await db.insert(account).values({
                id: accountId,
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-3',
                accessToken: 'stale-token-looks-valid',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
                refreshToken: 'working-refresh-token',
            });

            let attempts = 0;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/token')) {
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({
                                    access_token: 'retried-access-token',
                                    expires_in: 3600,
                                }),
                                {
                                    status: 200,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                },
                            ),
                        );
                    }
                    if (urlStr.includes('/calendars/primary/events')) {
                        attempts++;
                        if (attempts === 1) {
                            return Promise.resolve(
                                new Response(
                                    JSON.stringify({ error: 'Unauthorized' }),
                                    {
                                        status: 401,
                                    },
                                ),
                            );
                        }
                        const headers = init?.headers as Record<string, string>;
                        expect(headers['Authorization']).toBe(
                            'Bearer retried-access-token',
                        );
                        return Promise.resolve(
                            new Response(
                                JSON.stringify({ id: 'event-after-401' }),
                                {
                                    status: 200,
                                },
                            ),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                const result = await adapter.insert(testUserId, {
                    name: 'Retry Event',
                    start_date: new Date(),
                    end_date: new Date(),
                });

                expect(result).toBe('event-after-401');
                expect(attempts).toBe(2);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('patch', () => {
        it('should patch event on Google Calendar', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-4',
                accessToken: 'patch-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            let patched = false;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/calendars/primary/events/g-123')) {
                        expect(init?.method).toBe('PATCH');
                        const body = JSON.parse(init?.body as string);
                        expect(body.summary).toBe('Updated Title');
                        patched = true;
                        return Promise.resolve(
                            new Response('{}', { status: 200 }),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                await adapter.patch(testUserId, 'g-123', {
                    name: 'Updated Title',
                });
                expect(patched).toBe(true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should preserve timezone offset in dateTime and include timeZone when patching dates', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-patch-tz',
                accessToken: 'patch-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            let capturedBody: Record<string, unknown> | null = null;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/calendars/primary/events/g-456')) {
                        capturedBody = JSON.parse(init?.body as string);
                        return Promise.resolve(
                            new Response('{}', { status: 200 }),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                await adapter.patch(testUserId, 'g-456', {
                    start_date: '2026-10-21T14:00:00-03:00',
                    end_date: '2026-10-21T17:00:00-03:00',
                });

                expect(capturedBody).not.toBeNull();
                expect(capturedBody!.start).toEqual({
                    dateTime: '2026-10-21T14:00:00-03:00',
                    timeZone: 'America/Sao_Paulo',
                });
                expect(capturedBody!.end).toEqual({
                    dateTime: '2026-10-21T17:00:00-03:00',
                    timeZone: 'America/Sao_Paulo',
                });
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should throw GoogleCalendarNotFoundError when Google returns 404 or 410 on patch', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-patch-404',
                accessToken: 'patch-token-404',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(() =>
                Promise.resolve(new Response('Not Found', { status: 404 })),
            ) as any;

            try {
                await expect(
                    adapter.patch(testUserId, 'missing-id', { name: 'Test' }),
                ).rejects.toThrow(GoogleCalendarNotFoundError);

                globalThis.fetch = mock(() =>
                    Promise.resolve(new Response('Gone', { status: 410 })),
                ) as any;

                await expect(
                    adapter.patch(testUserId, 'gone-id', { name: 'Test' }),
                ).rejects.toThrow(GoogleCalendarNotFoundError);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('delete', () => {
        it('should delete event on Google Calendar', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-5',
                accessToken: 'del-token',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            let deleted = false;
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(
                (url: string | URL | Request, init?: RequestInit) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/calendars/primary/events/g-999')) {
                        expect(init?.method).toBe('DELETE');
                        deleted = true;
                        return Promise.resolve(
                            new Response(null, { status: 204 }),
                        );
                    }
                    return Promise.reject(
                        new Error(`Unexpected fetch: ${urlStr}`),
                    );
                },
            ) as any;

            try {
                await adapter.delete(testUserId, 'g-999');
                expect(deleted).toBe(true);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should treat 404 response on delete as idempotent success', async () => {
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: testUserId,
                providerId: 'google',
                accountId: 'google-acc-6',
                accessToken: 'del-token-404',
                accessTokenExpiresAt: new Date(Date.now() + 3600000),
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(() => {
                return Promise.resolve(
                    new Response('Not Found', { status: 404 }),
                );
            }) as any;

            try {
                await expect(
                    adapter.delete(testUserId, 'already-gone'),
                ).resolves.toBeUndefined();
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
});

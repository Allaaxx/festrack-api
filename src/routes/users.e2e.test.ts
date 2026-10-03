import { describe, it, expect, spyOn } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { S3StorageService } from '../adapters/index.js';
import { db } from '../db/postgres/index.js';
import {
    account,
    eventsTable,
    transactionsTable,
    session,
    usersTable,
} from '../db/postgres/schemas/index.js';
import { eq } from 'drizzle-orm';

const VALID_PNG_BYTES = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
);

describe('Users Routes (Elysia E2E)', () => {
    const client = testClient(app);

    describe('GET /api/users/me', () => {
        it('should return 200 with Bearer token', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/users/me')
                .set('Authorization', authUser.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(authUser.user.id);
            expect(response.body.email).toBe(authUser.user.email);
            expect(response.body.first_name).toBe(authUser.user.first_name);
            expect(response.body.last_name).toBe(authUser.user.last_name);
        });

        it('should return 200 with Cookie', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/users/me')
                .set('Cookie', authUser.cookieHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(authUser.user.id);
            expect(response.body.email).toBe(authUser.user.email);
        });

        it('should return 401 when token is missing', async () => {
            const response = await client.get('/api/users/me');
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 401 when token is invalid or expired', async () => {
            const response = await client
                .get('/api/users/me')
                .set('Authorization', 'Bearer invalid_or_expired_token');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });
    });

    describe('POST /api/users/me/avatar', () => {
        it('should upload avatar successfully with Bearer token', async () => {
            const uploadSpy = spyOn(
                S3StorageService.prototype,
                'upload',
            ).mockResolvedValue(
                'https://storage.example.com/festrack/avatars/test.png',
            );

            const authUser = await createAuthenticatedUser(client);
            const formData = new FormData();
            formData.append(
                'avatar',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'avatar.png',
            );

            const response = await client
                .post('/api/users/me/avatar')
                .set('Authorization', authUser.bearerHeader)
                .send(formData);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(authUser.user.id);
            expect(response.body.image).toBe(
                'https://storage.example.com/festrack/avatars/test.png',
            );
            uploadSpy.mockRestore();
        });

        it('should return 400 when file type is not allowed', async () => {
            const authUser = await createAuthenticatedUser(client);
            const formData = new FormData();
            formData.append(
                'avatar',
                new Blob(['fake text content'], { type: 'text/plain' }),
                'document.txt',
            );

            const response = await client
                .post('/api/users/me/avatar')
                .set('Authorization', authUser.bearerHeader)
                .send(formData);

            expect(response.status).toBe(400);
        });

        it('should return 400 when file size exceeds 5MB', async () => {
            const authUser = await createAuthenticatedUser(client);
            const sixMbBuffer = new Uint8Array(6 * 1024 * 1024);
            const formData = new FormData();
            formData.append(
                'avatar',
                new Blob([sixMbBuffer], { type: 'image/png' }),
                'large.png',
            );

            const response = await client
                .post('/api/users/me/avatar')
                .set('Authorization', authUser.bearerHeader)
                .send(formData);

            expect(response.status).toBe(400);
        });

        it('should return 400 when avatar file field is missing', async () => {
            const authUser = await createAuthenticatedUser(client);
            const formData = new FormData();
            formData.append('unrelated', 'value');

            const response = await client
                .post('/api/users/me/avatar')
                .set('Authorization', authUser.bearerHeader)
                .send(formData);

            expect(response.status).toBe(400);
        });

        it('should return 401 when uploading avatar without authentication', async () => {
            const formData = new FormData();
            formData.append(
                'avatar',
                new Blob([VALID_PNG_BYTES], { type: 'image/png' }),
                'avatar.png',
            );

            const response = await client
                .post('/api/users/me/avatar')
                .send(formData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });
    });

    describe('PATCH /api/users/me', () => {
        it('should update profile with Bearer token', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .patch('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    first_name: 'UpdatedFirst',
                    last_name: 'UpdatedLast',
                });

            expect(response.status).toBe(200);
            expect(response.body.first_name).toBe('UpdatedFirst');
            expect(response.body.last_name).toBe('UpdatedLast');
        });

        it('should update profile with Cookie', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .patch('/api/users/me')
                .set('Cookie', authUser.cookieHeader)
                .send({
                    first_name: 'CookieFirst',
                    last_name: 'CookieLast',
                });

            expect(response.status).toBe(200);
            expect(response.body.first_name).toBe('CookieFirst');
            expect(response.body.last_name).toBe('CookieLast');
        });

        it('should return 400 when email is already in use', async () => {
            const userA = await createAuthenticatedUser(client, {
                email: `usera_${Date.now()}@example.com`,
            });
            const userB = await createAuthenticatedUser(client, {
                email: `userb_${Date.now()}@example.com`,
            });

            const response = await client
                .patch('/api/users/me')
                .set('Authorization', userB.bearerHeader)
                .send({
                    email: userA.user.email,
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('already in use');
        });

        it('should return 400 when body has unexpected properties', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .patch('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    phone: '1234567890',
                });

            expect(response.status).toBe(400);
        });

        it('should return 400 when body contains password', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .patch('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    password: 'newpassword123',
                });

            expect(response.status).toBe(400);
        });

        it('should return 401 when not authenticated', async () => {
            const response = await client.patch('/api/users/me').send({
                first_name: 'NoAuth',
            });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });
    });

    describe('DELETE /api/users/me', () => {
        it('should reject deletion with 400 when password is missing', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .delete('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({});

            expect(response.status).toBe(400);
        });

        it('should reject deletion with 400 when password is wrong', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .delete('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    password: 'WrongPassword123!',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid password');
        });

        it('should return 401 when deleting without auth', async () => {
            const response = await client.delete('/api/users/me').send({
                password: 'Password123!',
            });
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should delete user with Bearer token, cascade cleanup events, transactions, accounts, sessions and revoke auth', async () => {
            const authUser = await createAuthenticatedUser(client, {
                password: 'MyValidPassword123!',
            });
            const userId = authUser.user.id;

            // Create an event for this user
            const [createdEvent] = await db
                .insert(eventsTable)
                .values({
                    name: 'Cascade Event',
                    description: 'Event to test cascade delete',
                    start_date: new Date(),
                    end_date: new Date(),
                    user_id: userId,
                })
                .returning();

            // Create a transaction for this user
            await db.insert(transactionsTable).values({
                name: 'Cascade Transaction',
                amount: '50.00',
                date: new Date(),
                type: 'EXPENSE',
                user_id: userId,
                event_id: createdEvent.id,
            });

            // Verify before delete
            const eventsBefore = await db
                .select()
                .from(eventsTable)
                .where(eq(eventsTable.user_id, userId));
            expect(eventsBefore.length).toBe(1);

            const transactionsBefore = await db
                .select()
                .from(transactionsTable)
                .where(eq(transactionsTable.user_id, userId));
            expect(transactionsBefore.length).toBe(1);

            const accountsBefore = await db
                .select()
                .from(account)
                .where(eq(account.userId, userId));
            expect(accountsBefore.length).toBeGreaterThanOrEqual(1);

            const sessionsBefore = await db
                .select()
                .from(session)
                .where(eq(session.userId, userId));
            expect(sessionsBefore.length).toBeGreaterThanOrEqual(1);

            // Execute delete
            const response = await client
                .delete('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({
                    password: 'MyValidPassword123!',
                });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(userId);

            // Verify cascade deletion
            const usersAfter = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, userId));
            expect(usersAfter.length).toBe(0);

            const eventsAfter = await db
                .select()
                .from(eventsTable)
                .where(eq(eventsTable.user_id, userId));
            expect(eventsAfter.length).toBe(0);

            const transactionsAfter = await db
                .select()
                .from(transactionsTable)
                .where(eq(transactionsTable.user_id, userId));
            expect(transactionsAfter.length).toBe(0);

            const accountsAfter = await db
                .select()
                .from(account)
                .where(eq(account.userId, userId));
            expect(accountsAfter.length).toBe(0);

            const sessionsAfter = await db
                .select()
                .from(session)
                .where(eq(session.userId, userId));
            expect(sessionsAfter.length).toBe(0);

            // Verify session revocation: subsequent requests are rejected with 401
            const profileResponse = await client
                .get('/api/users/me')
                .set('Authorization', authUser.bearerHeader);
            expect(profileResponse.status).toBe(401);
        });

        it('should delete user with Cookie when valid password is provided', async () => {
            const authUser = await createAuthenticatedUser(client, {
                password: 'CookiePassword123!',
            });

            const response = await client
                .delete('/api/users/me')
                .set('Cookie', authUser.cookieHeader)
                .send({
                    password: 'CookiePassword123!',
                });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(authUser.user.id);

            // Subsequent request with Cookie should be rejected with 401
            const profileResponse = await client
                .get('/api/users/me')
                .set('Cookie', authUser.cookieHeader);
            expect(profileResponse.status).toBe(401);
        });
    });

    describe('GET /api/users/me/balance', () => {
        it('should return 200 with Bearer token', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/users/me/balance?from=2026-01-01&to=2026-12-31')
                .set('Authorization', authUser.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('earnings');
            expect(response.body).toHaveProperty('expenses');
            expect(response.body).toHaveProperty('investments');
            expect(response.body).toHaveProperty('balance');
        });

        it('should return 200 with Cookie', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/users/me/balance?from=2026-01-01&to=2026-12-31')
                .set('Cookie', authUser.cookieHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('balance');
        });

        it('should return 400 when query dates are invalid', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/users/me/balance?from=invalid-date&to=2026-12-31')
                .set('Authorization', authUser.bearerHeader);

            expect(response.status).toBe(400);
        });

        it('should return 401 when fetching balance without auth', async () => {
            const response = await client.get(
                '/api/users/me/balance?from=2026-01-01&to=2026-12-31',
            );

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });
    });

    describe('GET /api/users/me/accounts', () => {
        it('should return 401 when unauthenticated', async () => {
            const response = await client.get('/api/users/me/accounts');
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 200 with list of connected accounts for authenticated user', async () => {
            const authUser = await createAuthenticatedUser(client);

            // Insert additional Google account for this user
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: authUser.user.id,
                providerId: 'google',
                accountId: `google_${Date.now()}`,
                accessToken: 'ya29.mock_token',
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
            });

            const response = await client
                .get('/api/users/me/accounts')
                .set('Authorization', authUser.bearerHeader);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);

            const providerIds = response.body.map((a: any) => a.providerId);
            expect(providerIds).toContain('credential');
            expect(providerIds).toContain('google');

            for (const acc of response.body) {
                expect(acc).toHaveProperty('id');
                expect(acc).toHaveProperty('providerId');
                expect(acc).not.toHaveProperty('password');
                expect(acc).not.toHaveProperty('accessToken');
            }
        });
    });

    describe('POST /api/users/me/accounts/unlink', () => {
        it('should return 401 when unauthenticated', async () => {
            const response = await client
                .post('/api/users/me/accounts/unlink')
                .send({ providerId: 'google' });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 when attempting to unlink the only remaining provider', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/users/me/accounts/unlink')
                .set('Authorization', authUser.bearerHeader)
                .send({ providerId: 'credential' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(
                'Cannot unlink the only remaining authentication provider.',
            );
        });

        it('should return 404 when attempting to unlink a provider that does not exist', async () => {
            const authUser = await createAuthenticatedUser(client);

            // Add another account so length > 1
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: authUser.user.id,
                providerId: 'google',
                accountId: `google_${Date.now()}`,
            });

            const response = await client
                .post('/api/users/me/accounts/unlink')
                .set('Authorization', authUser.bearerHeader)
                .send({ providerId: 'github' });

            expect(response.status).toBe(404);
            expect(response.body.message).toContain(
                'Account with provider github not found.',
            );
        });

        it('should successfully unlink an external provider when multiple providers exist and delete corresponding account row', async () => {
            const authUser = await createAuthenticatedUser(client);

            const googleAccountId = `google_${Date.now()}`;
            await db.insert(account).values({
                id: crypto.randomUUID(),
                userId: authUser.user.id,
                providerId: 'google',
                accountId: googleAccountId,
                accessToken: 'ya29.mock_token',
                refreshToken: '1//mock_refresh',
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
            });

            // Verify 2 accounts exist prior to unlinking
            const beforeAccounts = await db
                .select()
                .from(account)
                .where(eq(account.userId, authUser.user.id));
            expect(beforeAccounts.length).toBe(2);

            const response = await client
                .post('/api/users/me/accounts/unlink')
                .set('Authorization', authUser.bearerHeader)
                .send({ providerId: 'google' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify Google account is deleted from DB
            const afterAccounts = await db
                .select()
                .from(account)
                .where(eq(account.userId, authUser.user.id));
            expect(afterAccounts.length).toBe(1);
            expect(afterAccounts[0].providerId).toBe('credential');
        });
    });
});

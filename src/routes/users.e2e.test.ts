import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';

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
        it('should delete user with Bearer token', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .delete('/api/users/me')
                .set('Authorization', authUser.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(authUser.user.id);
        });

        it('should delete user with Cookie', async () => {
            const authUser = await createAuthenticatedUser(client);

            const response = await client
                .delete('/api/users/me')
                .set('Cookie', authUser.cookieHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(authUser.user.id);
        });

        it('should return 401 when deleting without auth', async () => {
            const response = await client.delete('/api/users/me');
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
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
});

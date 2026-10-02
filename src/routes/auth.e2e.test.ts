import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';

describe('Better Auth Endpoints (E2E)', () => {
    const client = testClient(app);

    describe('POST /api/auth/sign-up/email', () => {
        it('should register a new user with first_name and last_name and return session token', async () => {
            const uniqueEmail = `test_signup_${Date.now()}@example.com`;
            const response = await client.post('/api/auth/sign-up/email').send({
                email: uniqueEmail,
                password: 'Password123!',
                first_name: 'John',
                last_name: 'Doe',
            });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(uniqueEmail);
            expect(response.body.user.first_name).toBe('John');
            expect(response.body.user.last_name).toBe('Doe');
            expect(response.headers.get('set-cookie')).toContain(
                'better-auth.session_token',
            );
        });

        it('should reject duplicate email registration with 400', async () => {
            const uniqueEmail = `test_dup_${Date.now()}@example.com`;
            await client.post('/api/auth/sign-up/email').send({
                email: uniqueEmail,
                password: 'Password123!',
                first_name: 'John',
                last_name: 'Doe',
            });

            const response = await client.post('/api/auth/sign-up/email').send({
                email: uniqueEmail,
                password: 'Password123!',
                first_name: 'Jane',
                last_name: 'Doe',
            });

            expect([400, 422]).toContain(response.status);
            expect(response.body.message).toBeDefined();
        });

        it('should reject invalid email format with 400', async () => {
            const response = await client.post('/api/auth/sign-up/email').send({
                email: 'invalid-email',
                password: 'Password123!',
                first_name: 'John',
                last_name: 'Doe',
            });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/auth/sign-in/email', () => {
        it('should sign in registered user and return session token and HTTP-only cookie', async () => {
            const uniqueEmail = `test_signin_${Date.now()}@example.com`;
            await client.post('/api/auth/sign-up/email').send({
                email: uniqueEmail,
                password: 'Password123!',
                first_name: 'Alice',
                last_name: 'Smith',
            });

            const response = await client.post('/api/auth/sign-in/email').send({
                email: uniqueEmail,
                password: 'Password123!',
            });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe(uniqueEmail);
            expect(response.body.user.first_name).toBe('Alice');
            expect(response.body.user.last_name).toBe('Smith');
            expect(response.headers.get('set-cookie')).toContain(
                'better-auth.session_token',
            );
        });

        it('should return 401 when password is invalid', async () => {
            const uniqueEmail = `test_wrongpw_${Date.now()}@example.com`;
            await client.post('/api/auth/sign-up/email').send({
                email: uniqueEmail,
                password: 'Password123!',
                first_name: 'Bob',
                last_name: 'Brown',
            });

            const response = await client.post('/api/auth/sign-in/email').send({
                email: uniqueEmail,
                password: 'WrongPassword!',
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBeDefined();
        });

        it('should return 401 when email does not exist', async () => {
            const response = await client.post('/api/auth/sign-in/email').send({
                email: 'nonexistent@example.com',
                password: 'Password123!',
            });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/auth/get-session', () => {
        it('should return active session using Cookie header', async () => {
            const uniqueEmail = `test_cookie_sess_${Date.now()}@example.com`;
            const signUpRes = await client
                .post('/api/auth/sign-up/email')
                .send({
                    email: uniqueEmail,
                    password: 'Password123!',
                    first_name: 'Charlie',
                    last_name: 'Green',
                });

            const setCookie = signUpRes.headers.get('set-cookie');
            const cookieHeader = setCookie?.split(';')[0] || '';

            const response = await client
                .get('/api/auth/get-session')
                .set('Cookie', cookieHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('session');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(uniqueEmail);
        });

        it('should return active session using Authorization: Bearer header', async () => {
            const uniqueEmail = `test_bearer_sess_${Date.now()}@example.com`;
            const signUpRes = await client
                .post('/api/auth/sign-up/email')
                .send({
                    email: uniqueEmail,
                    password: 'Password123!',
                    first_name: 'Diana',
                    last_name: 'Prince',
                });

            const token = signUpRes.body.token;

            const response = await client
                .get('/api/auth/get-session')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('session');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(uniqueEmail);
            expect(response.body.session.token).toBe(token);
        });

        it('should return null when unauthenticated', async () => {
            const response = await client.get('/api/auth/get-session');

            expect(response.status).toBe(200);
            expect(response.body).toBeNull();
        });
    });

    describe('POST /api/auth/sign-out', () => {
        it('should revoke active session via Bearer token', async () => {
            const uniqueEmail = `test_signout_${Date.now()}@example.com`;
            const signUpRes = await client
                .post('/api/auth/sign-up/email')
                .send({
                    email: uniqueEmail,
                    password: 'Password123!',
                    first_name: 'Edward',
                    last_name: 'Norton',
                });

            const token = signUpRes.body.token;

            const signOutRes = await client
                .post('/api/auth/sign-out')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(signOutRes.status).toBe(200);
            expect(signOutRes.body).toEqual({ success: true });

            // Session should now be invalid
            const getSessionRes = await client
                .get('/api/auth/get-session')
                .set('Authorization', `Bearer ${token}`);

            expect(getSessionRes.status).toBe(200);
            expect(getSessionRes.body).toBeNull();
        });

        it('should revoke active session via Cookie', async () => {
            const uniqueEmail = `test_signout_cookie_${Date.now()}@example.com`;
            const signUpRes = await client
                .post('/api/auth/sign-up/email')
                .send({
                    email: uniqueEmail,
                    password: 'Password123!',
                    first_name: 'Fiona',
                    last_name: 'Gallagher',
                });

            const setCookie = signUpRes.headers.get('set-cookie');
            const cookieHeader = setCookie?.split(';')[0] || '';

            const signOutRes = await client
                .post('/api/auth/sign-out')
                .set('Cookie', cookieHeader)
                .send({});

            expect(signOutRes.status).toBe(200);
            expect(signOutRes.body).toEqual({ success: true });

            const getSessionRes = await client
                .get('/api/auth/get-session')
                .set('Cookie', cookieHeader);

            expect(getSessionRes.status).toBe(200);
            expect(getSessionRes.body).toBeNull();
        });
    });
});

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { db } from '../db/postgres/index.js';
import { user, account } from '../db/postgres/schemas/index.js';
import { eq } from 'drizzle-orm';

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

    describe('Origin Validation', () => {
        it('should allow requests with trusted origin http://localhost:5174', async () => {
            const uniqueEmail = `test_origin_${Date.now()}@example.com`;
            const response = await client
                .post('/api/auth/sign-up/email')
                .set('Origin', 'http://localhost:5174')
                .send({
                    email: uniqueEmail,
                    password: 'Password123!',
                    first_name: 'Origin',
                    last_name: 'Tester',
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
        });
    });

    describe('Google OAuth & Social Linking Endpoints', () => {
        const originalFetch = globalThis.fetch;
        let mockTokenResponse: any = null;

        const createMockGoogleIdToken = (payload: {
            sub: string;
            email: string;
            name?: string;
            given_name?: string;
            family_name?: string;
            picture?: string;
        }) => {
            const header = Buffer.from(
                JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
            ).toString('base64url');
            const fullPayload = Buffer.from(
                JSON.stringify({
                    sub: payload.sub,
                    email: payload.email,
                    email_verified: true,
                    name: payload.name || 'Google User',
                    given_name: payload.given_name || 'Google',
                    family_name: payload.family_name || 'User',
                    picture:
                        payload.picture || 'https://example.com/avatar.jpg',
                    iss: 'https://accounts.google.com',
                    aud: 'mock-google-client-id',
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600,
                }),
            ).toString('base64url');
            return `${header}.${fullPayload}.mock_signature`;
        };

        beforeEach(() => {
            mockTokenResponse = null;
            globalThis.fetch = (async (input, init) => {
                const url =
                    typeof input === 'string'
                        ? input
                        : input instanceof Request
                          ? input.url
                          : input.toString();
                if (
                    url.includes('oauth2.googleapis.com/token') &&
                    mockTokenResponse
                ) {
                    return new Response(JSON.stringify(mockTokenResponse), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }
                return originalFetch(input, init);
            }) as typeof fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        describe('POST /api/auth/sign-in/social', () => {
            it('should initiate Google OAuth and return authorization URL with offline access, prompt consent, and calendar scope', async () => {
                const response = await client
                    .post('/api/auth/sign-in/social')
                    .send({
                        provider: 'google',
                        callbackURL: 'http://localhost:5174/dashboard',
                    });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('url');
                expect(response.body).toHaveProperty('redirect', true);

                const url = new URL(response.body.url);
                expect(url.origin).toBe('https://accounts.google.com');
                expect(url.searchParams.get('response_type')).toBe('code');
                expect(url.searchParams.get('client_id')).toBe(
                    'mock-google-client-id',
                );
                expect(url.searchParams.get('access_type')).toBe('offline');
                expect(url.searchParams.get('prompt')).toBe('consent');

                const scope = url.searchParams.get('scope') || '';
                expect(scope).toContain(
                    'https://www.googleapis.com/auth/calendar.events',
                );
                expect(scope).toContain('email');
                expect(scope).toContain('profile');

                expect(response.headers.get('set-cookie')).toContain(
                    'better-auth.state',
                );
            });
        });

        describe('POST /api/auth/link-social', () => {
            it('should reject unauthenticated request with 401', async () => {
                const response = await client
                    .post('/api/auth/link-social')
                    .send({
                        provider: 'google',
                        callbackURL: 'http://localhost:5174/settings',
                    });

                expect([401, 403]).toContain(response.status);
            });

            it('should return authorization URL when authenticated user requests linking', async () => {
                const uniqueEmail = `link_init_${Date.now()}@example.com`;
                const signUpRes = await client
                    .post('/api/auth/sign-up/email')
                    .send({
                        email: uniqueEmail,
                        password: 'Password123!',
                        first_name: 'Link',
                        last_name: 'Tester',
                    });

                const token = signUpRes.body.token;

                const response = await client
                    .post('/api/auth/link-social')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        provider: 'google',
                        callbackURL: 'http://localhost:5174/settings',
                    });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('url');
                expect(response.body).toHaveProperty('redirect', true);

                const url = new URL(response.body.url);
                expect(url.origin).toBe('https://accounts.google.com');
                expect(url.searchParams.get('access_type')).toBe('offline');
                expect(url.searchParams.get('prompt')).toBe('consent');
                expect(url.searchParams.get('scope')).toContain(
                    'https://www.googleapis.com/auth/calendar.events',
                );
                expect(response.headers.get('set-cookie')).toContain(
                    'better-auth.state',
                );
            });
        });

        describe('GET /api/auth/callback/google', () => {
            it('should register new user and persist Google OAuth tokens in account table upon successful callback', async () => {
                const signInRes = await client
                    .post('/api/auth/sign-in/social')
                    .send({
                        provider: 'google',
                        callbackURL: 'http://localhost:5174/dashboard',
                    });

                const authUrl = new URL(signInRes.body.url);
                const state = authUrl.searchParams.get('state');
                const stateCookie =
                    signInRes.headers.get('set-cookie')?.split(';')[0] || '';

                const googleSub = `google_sub_${Date.now()}`;
                const googleEmail = `google_reg_${Date.now()}@example.com`;
                const mockAccessToken = 'ya29.test_google_access_token';
                const mockRefreshToken = '1//test_google_refresh_token';
                const mockScope =
                    'openid email profile https://www.googleapis.com/auth/calendar.events';

                const idToken = createMockGoogleIdToken({
                    sub: googleSub,
                    email: googleEmail,
                    given_name: 'GoogleFirst',
                    family_name: 'GoogleLast',
                });

                mockTokenResponse = {
                    access_token: mockAccessToken,
                    refresh_token: mockRefreshToken,
                    expires_in: 3600,
                    token_type: 'Bearer',
                    scope: mockScope,
                    id_token: idToken,
                };

                const callbackRes = await client
                    .get(
                        `/api/auth/callback/google?code=mock_code&state=${state}`,
                    )
                    .set('Cookie', stateCookie);

                expect([302, 200]).toContain(callbackRes.status);
                if (callbackRes.status === 302) {
                    expect(callbackRes.headers.get('location')).toContain(
                        'http://localhost:5174/dashboard',
                    );
                }

                // Verify user was registered in DB with mapped first_name and last_name
                const [registeredUser] = await db
                    .select()
                    .from(user)
                    .where(eq(user.email, googleEmail));

                expect(registeredUser).toBeDefined();
                expect(registeredUser.first_name).toBe('GoogleFirst');
                expect(registeredUser.last_name).toBe('GoogleLast');

                // Verify tokens are stored in the account table
                const [savedAccount] = await db
                    .select()
                    .from(account)
                    .where(eq(account.userId, registeredUser.id));

                expect(savedAccount).toBeDefined();
                expect(savedAccount.providerId).toBe('google');
                expect(savedAccount.accountId).toBe(googleSub);
                expect(savedAccount.accessToken).toBe(mockAccessToken);
                expect(savedAccount.refreshToken).toBe(mockRefreshToken);
                expect(savedAccount.scope).toContain(
                    'https://www.googleapis.com/auth/calendar.events',
                );
                expect(savedAccount.accessTokenExpiresAt).toBeInstanceOf(Date);
            });

            it('should link Google account to existing authenticated user upon callback', async () => {
                const uniqueEmail = `link_existing_${Date.now()}@example.com`;
                const signUpRes = await client
                    .post('/api/auth/sign-up/email')
                    .send({
                        email: uniqueEmail,
                        password: 'Password123!',
                        first_name: 'Existing',
                        last_name: 'User',
                    });

                const token = signUpRes.body.token;
                const existingUserId = signUpRes.body.user.id;

                const linkRes = await client
                    .post('/api/auth/link-social')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        provider: 'google',
                        callbackURL: 'http://localhost:5174/settings',
                    });

                const linkUrl = new URL(linkRes.body.url);
                const state = linkUrl.searchParams.get('state');
                const linkCookie =
                    linkRes.headers.get('set-cookie')?.split(';')[0] || '';

                const googleSub = `google_linked_sub_${Date.now()}`;
                const mockAccessToken = 'ya29.linked_google_access_token';
                const mockRefreshToken = '1//linked_google_refresh_token';

                const idToken = createMockGoogleIdToken({
                    sub: googleSub,
                    email: uniqueEmail,
                    given_name: 'Existing',
                    family_name: 'User',
                });

                mockTokenResponse = {
                    access_token: mockAccessToken,
                    refresh_token: mockRefreshToken,
                    expires_in: 3600,
                    token_type: 'Bearer',
                    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                    id_token: idToken,
                };

                const callbackRes = await client
                    .get(
                        `/api/auth/callback/google?code=mock_code&state=${state}`,
                    )
                    .set('Cookie', linkCookie);

                expect([302, 200]).toContain(callbackRes.status);

                // Verify the user now has two accounts in DB: credential and google
                const userAccounts = await db
                    .select()
                    .from(account)
                    .where(eq(account.userId, existingUserId));

                expect(userAccounts.length).toBe(2);
                const providers = userAccounts.map((a) => a.providerId);
                expect(providers).toContain('credential');
                expect(providers).toContain('google');

                const googleAccount = userAccounts.find(
                    (a) => a.providerId === 'google',
                );
                expect(googleAccount).toBeDefined();
                expect(googleAccount?.accessToken).toBe(mockAccessToken);
                expect(googleAccount?.refreshToken).toBe(mockRefreshToken);
                expect(googleAccount?.scope).toContain(
                    'https://www.googleapis.com/auth/calendar.events',
                );
            });

            it('should merge/link Google account to existing registered email user when signing in with Google', async () => {
                const uniqueEmail = `existing_email_${Date.now()}@example.com`;
                const signUpRes = await client
                    .post('/api/auth/sign-up/email')
                    .send({
                        email: uniqueEmail,
                        password: 'Password123!',
                        first_name: 'Existing',
                        last_name: 'EmailUser',
                    });

                expect(signUpRes.status).toBe(200);
                const existingUserId = signUpRes.body.user.id;

                const signInRes = await client
                    .post('/api/auth/sign-in/social')
                    .send({
                        provider: 'google',
                        callbackURL: 'http://localhost:5174/dashboard',
                    });

                const authUrl = new URL(signInRes.body.url);
                const state = authUrl.searchParams.get('state');
                const stateCookie =
                    signInRes.headers.get('set-cookie')?.split(';')[0] || '';

                const googleSub = `google_same_email_sub_${Date.now()}`;
                const mockAccessToken = 'ya29.merge_google_access_token';
                const mockRefreshToken = '1//merge_google_refresh_token';

                const idToken = createMockGoogleIdToken({
                    sub: googleSub,
                    email: uniqueEmail,
                    given_name: 'Existing',
                    family_name: 'EmailUser',
                });

                mockTokenResponse = {
                    access_token: mockAccessToken,
                    refresh_token: mockRefreshToken,
                    expires_in: 3600,
                    token_type: 'Bearer',
                    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                    id_token: idToken,
                };

                const callbackRes = await client
                    .get(
                        `/api/auth/callback/google?code=mock_code&state=${state}`,
                    )
                    .set('Cookie', stateCookie);

                expect([302, 200]).toContain(callbackRes.status);
                if (callbackRes.status === 302) {
                    const location = callbackRes.headers.get('location') || '';
                    expect(location).toContain(
                        'http://localhost:5174/dashboard',
                    );
                    expect(location).not.toContain('error=');
                }

                // Verify the user now has two accounts in DB: credential and google
                const userAccounts = await db
                    .select()
                    .from(account)
                    .where(eq(account.userId, existingUserId));

                expect(userAccounts.length).toBe(2);
                const providers = userAccounts.map((a) => a.providerId);
                expect(providers).toContain('credential');
                expect(providers).toContain('google');
            });
        });

        describe('GET /api/auth/list-accounts', () => {
            it('should reject unauthenticated request with 401', async () => {
                const response = await client.get('/api/auth/list-accounts');
                expect(response.status).toBe(401);
            });

            it('should return connected accounts for authenticated user', async () => {
                const uniqueEmail = `list_auth_${Date.now()}@example.com`;
                const signUpRes = await client
                    .post('/api/auth/sign-up/email')
                    .send({
                        email: uniqueEmail,
                        password: 'Password123!',
                        first_name: 'List',
                        last_name: 'Tester',
                    });

                const token = signUpRes.body.token;

                const response = await client
                    .get('/api/auth/list-accounts')
                    .set('Authorization', `Bearer ${token}`);

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                expect(response.body.length).toBe(1);
                expect(response.body[0].providerId).toBe('credential');
            });
        });

        describe('POST /api/auth/unlink-account', () => {
            it('should reject unauthenticated request with 401', async () => {
                const response = await client
                    .post('/api/auth/unlink-account')
                    .send({ providerId: 'google' });

                expect(response.status).toBe(401);
            });

            it('should return 400 when attempting to unlink the last account', async () => {
                const uniqueEmail = `unlink_last_${Date.now()}@example.com`;
                const signUpRes = await client
                    .post('/api/auth/sign-up/email')
                    .send({
                        email: uniqueEmail,
                        password: 'Password123!',
                        first_name: 'Single',
                        last_name: 'Provider',
                    });

                const token = signUpRes.body.token;

                const response = await client
                    .post('/api/auth/unlink-account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ providerId: 'credential' });

                expect(response.status).toBe(400);
                expect(response.body.code).toBe(
                    'FAILED_TO_UNLINK_LAST_ACCOUNT',
                );
            });

            it('should successfully unlink provider when multiple providers exist', async () => {
                const uniqueEmail = `unlink_multi_${Date.now()}@example.com`;
                const signUpRes = await client
                    .post('/api/auth/sign-up/email')
                    .send({
                        email: uniqueEmail,
                        password: 'Password123!',
                        first_name: 'Multi',
                        last_name: 'Account',
                    });

                const token = signUpRes.body.token;
                const userId = signUpRes.body.user.id;

                // Add Google account
                await db.insert(account).values({
                    id: crypto.randomUUID(),
                    userId,
                    providerId: 'google',
                    accountId: `google_${Date.now()}`,
                });

                const response = await client
                    .post('/api/auth/unlink-account')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ providerId: 'google' });

                expect(response.status).toBe(200);
                expect(response.body.status).toBe(true);

                // Verify Google account is deleted from DB
                const remainingAccounts = await db
                    .select()
                    .from(account)
                    .where(eq(account.userId, userId));

                expect(remainingAccounts.length).toBe(1);
                expect(remainingAccounts[0].providerId).toBe('credential');
            });
        });
    });
});

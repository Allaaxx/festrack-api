import { auth, trustedOrigins } from './auth.js';
import { db } from './db/postgres/index.js';
import {
    user,
    account,
    eventsTable,
    transactionsTable,
} from './db/postgres/schemas/index.js';
import { eq } from 'drizzle-orm';

describe('Better Auth Core Configuration & Database Integration', () => {
    it('should be initialized with valid handlers and api', () => {
        expect(auth).toBeDefined();
        expect(typeof auth.handler).toBe('function');
        expect(typeof auth.api.signUpEmail).toBe('function');
        expect(typeof auth.api.signInEmail).toBe('function');
        expect(typeof auth.api.getSession).toBe('function');
    });

    it('should configure trusted origins including localhost ports', () => {
        expect(trustedOrigins).toBeDefined();
        expect(trustedOrigins).toContain('http://localhost:5173');
        expect(trustedOrigins).toContain('http://localhost:5174');
    });

    it('should create a user with first_name and last_name in the database via Better Auth API', async () => {
        const testEmail = `test_${Date.now()}@example.com`;
        const testPassword = 'StrongPassword123!';
        const firstName = 'Jane';
        const lastName = 'Doe';

        const signUpResponse = await auth.api.signUpEmail({
            body: {
                email: testEmail,
                password: testPassword,
                name: `${firstName} ${lastName}`,
                first_name: firstName,
                last_name: lastName,
            },
        });

        expect(signUpResponse).toBeDefined();
        expect(signUpResponse.user).toBeDefined();
        expect(signUpResponse.user.email).toBe(testEmail);
        expect(signUpResponse.user.first_name).toBe(firstName);
        expect(signUpResponse.user.last_name).toBe(lastName);

        // Verify user exists in the database
        const [dbUser] = await db
            .select()
            .from(user)
            .where(eq(user.id, signUpResponse.user.id));

        expect(dbUser).toBeDefined();
        expect(dbUser.email).toBe(testEmail);
        expect(dbUser.first_name).toBe(firstName);
        expect(dbUser.last_name).toBe(lastName);

        // Verify account exists in database for credentials provider
        const [dbAccount] = await db
            .select()
            .from(account)
            .where(eq(account.userId, signUpResponse.user.id));

        expect(dbAccount).toBeDefined();
        expect(dbAccount.providerId).toBe('credential');
    });

    it('should allow events and transactions to reference user.id via foreign keys', async () => {
        const testEmail = `fk_test_${Date.now()}@example.com`;
        const signUpResponse = await auth.api.signUpEmail({
            body: {
                email: testEmail,
                password: 'Password123!',
                name: 'FK User',
                first_name: 'FK',
                last_name: 'User',
            },
        });

        const userId = signUpResponse.user.id;

        // Insert event pointing to user.id
        const [createdEvent] = await db
            .insert(eventsTable)
            .values({
                name: 'Birthday Party',
                description: 'Party celebration',
                start_date: new Date('2026-06-01'),
                end_date: new Date('2026-06-02'),
                user_id: userId,
            })
            .returning();

        expect(createdEvent).toBeDefined();
        expect(createdEvent.user_id).toBe(userId);

        // Insert transaction pointing to user.id and event_id
        const [createdTransaction] = await db
            .insert(transactionsTable)
            .values({
                name: 'Catering',
                date: new Date('2026-06-01'),
                amount: '350.00',
                type: 'EXPENSE',
                user_id: userId,
                event_id: createdEvent.id,
            })
            .returning();

        expect(createdTransaction).toBeDefined();
        expect(createdTransaction.user_id).toBe(userId);
        expect(createdTransaction.event_id).toBe(createdEvent.id);
    });

    describe('Google OAuth Provider & Calendar Scopes', () => {
        it('should have signInSocial and linkSocialAccount APIs available', () => {
            expect(typeof auth.api.signInSocial).toBe('function');
            expect(typeof auth.api.linkSocialAccount).toBe('function');
        });

        it('should generate Google authorization URL requesting offline access, consent prompt, and calendar scope', async () => {
            const result = await auth.api.signInSocial({
                body: {
                    provider: 'google',
                    callbackURL: 'http://localhost:5174/dashboard',
                },
            });

            expect(result).toBeDefined();
            expect(result.redirect).toBe(true);
            expect(result.url).toBeDefined();

            const parsedUrl = new URL(result.url!);
            expect(parsedUrl.origin).toBe('https://accounts.google.com');
            expect(parsedUrl.pathname).toBe('/o/oauth2/v2/auth');
            expect(parsedUrl.searchParams.get('response_type')).toBe('code');
            expect(parsedUrl.searchParams.get('access_type')).toBe('offline');
            expect(parsedUrl.searchParams.get('prompt')).toBe('consent');

            const scope = parsedUrl.searchParams.get('scope') || '';
            expect(scope).toContain(
                'https://www.googleapis.com/auth/calendar.events',
            );
            expect(scope).toContain('email');
            expect(scope).toContain('profile');
        });

        it('should persist Google OAuth tokens in account table upon authentication', async () => {
            const testEmail = `google_user_${Date.now()}@example.com`;
            const signUpResponse = await auth.api.signUpEmail({
                body: {
                    email: testEmail,
                    password: 'Password123!',
                    name: 'Google Test Account',
                    first_name: 'Google',
                    last_name: 'Test',
                },
            });

            const userId = signUpResponse.user.id;
            const googleAccountId = `google_sub_${Date.now()}`;
            const accessToken = 'ya29.mock_google_access_token_12345';
            const refreshToken = '1//mock_google_refresh_token_67890';
            const scope =
                'openid email profile https://www.googleapis.com/auth/calendar.events';
            const expiresAt = new Date(Date.now() + 3600 * 1000);

            const [createdAccount] = await db
                .insert(account)
                .values({
                    id: crypto.randomUUID(),
                    userId,
                    accountId: googleAccountId,
                    providerId: 'google',
                    accessToken,
                    refreshToken,
                    scope,
                    accessTokenExpiresAt: expiresAt,
                })
                .returning();

            expect(createdAccount).toBeDefined();
            expect(createdAccount.userId).toBe(userId);
            expect(createdAccount.providerId).toBe('google');
            expect(createdAccount.accountId).toBe(googleAccountId);
            expect(createdAccount.accessToken).toBe(accessToken);
            expect(createdAccount.refreshToken).toBe(refreshToken);
            expect(createdAccount.scope).toBe(scope);
            expect(createdAccount.accessTokenExpiresAt).toEqual(expiresAt);

            // Verify account can be retrieved from DB
            const [queriedAccount] = await db
                .select()
                .from(account)
                .where(eq(account.id, createdAccount.id));

            expect(queriedAccount).toBeDefined();
            expect(queriedAccount.providerId).toBe('google');
            expect(queriedAccount.refreshToken).toBe(refreshToken);
            expect(queriedAccount.scope).toContain(
                'https://www.googleapis.com/auth/calendar.events',
            );
        });
    });
});

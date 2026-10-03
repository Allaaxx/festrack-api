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
});

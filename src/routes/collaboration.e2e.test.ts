import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';

describe('Multi-User Collaboration & Tenancy Isolation E2E Tests (Elysia)', () => {
    const client = testClient(app);

    describe('Complete Multi-User Collaboration Lifecycle & Authorship Auditability', () => {
        it('should execute full team lifecycle: shop creation, invitation, acceptance, event creation, transaction logging, and shared ledger/balance symmetry', async () => {
            // 1. Setup authenticated users: User A (Owner) and User B (Member)
            const userA = await createAuthenticatedUser(client);
            const userB = await createAuthenticatedUser(client);

            // 2. User A creates Shop 1
            const createShopRes = await client
                .post('/api/shops')
                .set('Authorization', userA.bearerHeader)
                .send({
                    name: 'Festival Productions Co',
                    description: 'Collaborative festival management',
                });

            expect(createShopRes.status).toBe(201);
            expect(createShopRes.body.id).toBeDefined();
            expect(createShopRes.body.name).toBe('Festival Productions Co');
            const shopId = createShopRes.body.id;

            // 3. User A invites User B to Shop 1
            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', userA.bearerHeader)
                .send({
                    email: userB.user.email,
                    role: 'MEMBER',
                });

            expect(inviteRes.status).toBe(201);
            expect(inviteRes.body.token).toBeDefined();
            expect(inviteRes.body.email).toBe(userB.user.email.toLowerCase());
            expect(inviteRes.body.role).toBe('MEMBER');
            expect(inviteRes.body.status).toBe('PENDING');
            const invitationToken = inviteRes.body.token;

            // 4. User B accepts invitation
            const acceptRes = await client
                .post(`/api/shops/invitations/${invitationToken}/accept`)
                .set('Authorization', userB.bearerHeader);

            expect(acceptRes.status).toBe(200);

            // 5. Verify shop members list contains both User A (OWNER) and User B (MEMBER)
            const membersRes = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', userA.bearerHeader);

            expect(membersRes.status).toBe(200);
            expect(Array.isArray(membersRes.body)).toBe(true);
            expect(membersRes.body.length).toBe(2);

            const memberA = membersRes.body.find(
                (m: any) => m.user_id === userA.user.id,
            );
            const memberB = membersRes.body.find(
                (m: any) => m.user_id === userB.user.id,
            );

            expect(memberA).toBeDefined();
            expect(memberA.role).toBe('OWNER');
            expect(memberB).toBeDefined();
            expect(memberB.role).toBe('MEMBER');

            // 6. User A creates an Event in Shop 1
            const createEventRes = await client
                .post(`/api/shops/${shopId}/events`)
                .set('Authorization', userA.bearerHeader)
                .send({
                    name: 'Solstice Music Fest 2026',
                    description: 'Summer outdoor festival',
                    start_date: '2026-07-15T10:00:00.000Z',
                    end_date: '2026-07-17T22:00:00.000Z',
                });

            expect(createEventRes.status).toBe(201);
            expect(createEventRes.body.id).toBeDefined();
            expect(createEventRes.body.shop_id).toBe(shopId);
            // Authorship check for Event
            expect(createEventRes.body.created_by_user_id).toBe(userA.user.id);
            const eventId = createEventRes.body.id;

            // 7. User B logs transactions linked to User A's event
            // 7a. User B logs an EARNING transaction
            const earningTxRes = await client
                .post(`/api/shops/${shopId}/transactions`)
                .set('Authorization', userB.bearerHeader)
                .send({
                    name: 'Ticket Tier 1 Sales',
                    amount: 5000,
                    type: 'EARNING',
                    date: '2026-07-15T12:00:00.000Z',
                    event_id: eventId,
                });

            expect(earningTxRes.status).toBe(201);
            expect(earningTxRes.body.shop_id).toBe(shopId);
            expect(earningTxRes.body.created_by_user_id).toBe(userB.user.id);
            expect(earningTxRes.body.event_id).toBe(eventId);
            expect(earningTxRes.body.type).toBe('EARNING');
            expect(Number(earningTxRes.body.amount)).toBe(5000);
            const earningTxId = earningTxRes.body.id;

            // 7b. User B logs an EXPENSE transaction
            const expenseTxRes = await client
                .post(`/api/shops/${shopId}/transactions`)
                .set('Authorization', userB.bearerHeader)
                .send({
                    name: 'Stage and Lighting Rental',
                    amount: 1800,
                    type: 'EXPENSE',
                    date: '2026-07-15T14:00:00.000Z',
                    event_id: eventId,
                });

            expect(expenseTxRes.status).toBe(201);
            expect(expenseTxRes.body.shop_id).toBe(shopId);
            expect(expenseTxRes.body.created_by_user_id).toBe(userB.user.id);
            expect(expenseTxRes.body.event_id).toBe(eventId);
            expect(expenseTxRes.body.type).toBe('EXPENSE');
            expect(Number(expenseTxRes.body.amount)).toBe(1800);
            const expenseTxId = expenseTxRes.body.id;

            // 7c. User B logs an INVESTMENT transaction
            const investmentTxRes = await client
                .post(`/api/shops/${shopId}/transactions`)
                .set('Authorization', userB.bearerHeader)
                .send({
                    name: 'Sound Board Equipment Purchase',
                    amount: 1200,
                    type: 'INVESTMENT',
                    date: '2026-07-15T16:00:00.000Z',
                    event_id: eventId,
                });

            expect(investmentTxRes.status).toBe(201);
            expect(investmentTxRes.body.shop_id).toBe(shopId);
            expect(investmentTxRes.body.created_by_user_id).toBe(userB.user.id);
            expect(investmentTxRes.body.event_id).toBe(eventId);
            expect(investmentTxRes.body.type).toBe('INVESTMENT');
            expect(Number(investmentTxRes.body.amount)).toBe(1200);
            const investmentTxId = investmentTxRes.body.id;

            // 7d. User A logs an unlinked EARNING transaction for general shop merchandising
            const generalTxRes = await client
                .post(`/api/shops/${shopId}/transactions`)
                .set('Authorization', userA.bearerHeader)
                .send({
                    name: 'Online Merch Pre-Orders',
                    amount: 1000,
                    type: 'EARNING',
                    date: '2026-07-16T10:00:00.000Z',
                });

            expect(generalTxRes.status).toBe(201);
            expect(generalTxRes.body.shop_id).toBe(shopId);
            expect(generalTxRes.body.created_by_user_id).toBe(userA.user.id);
            expect(generalTxRes.body.event_id).toBeNull();
            const generalTxId = generalTxRes.body.id;

            // 8. Real-time Symmetry: Both User A and User B query Shop Events
            const eventsForUserA = await client
                .get(`/api/shops/${shopId}/events`)
                .set('Authorization', userA.bearerHeader);
            const eventsForUserB = await client
                .get(`/api/shops/${shopId}/events`)
                .set('Authorization', userB.bearerHeader);

            expect(eventsForUserA.status).toBe(200);
            expect(eventsForUserB.status).toBe(200);
            expect(eventsForUserA.body).toEqual(eventsForUserB.body);
            expect(eventsForUserA.body.length).toBe(1);
            expect(eventsForUserA.body[0].id).toBe(eventId);

            // 9. Real-time Symmetry: Both User A and User B query All Shop Transactions
            const txForUserA = await client
                .get(`/api/shops/${shopId}/transactions`)
                .set('Authorization', userA.bearerHeader);
            const txForUserB = await client
                .get(`/api/shops/${shopId}/transactions`)
                .set('Authorization', userB.bearerHeader);

            expect(txForUserA.status).toBe(200);
            expect(txForUserB.status).toBe(200);
            expect(txForUserA.body).toEqual(txForUserB.body);
            expect(txForUserA.body.length).toBe(4);

            // Verify authorship auditability preserved in list
            const foundEarning = txForUserA.body.find(
                (t: any) => t.id === earningTxId,
            );
            const foundExpense = txForUserA.body.find(
                (t: any) => t.id === expenseTxId,
            );
            const foundInvestment = txForUserA.body.find(
                (t: any) => t.id === investmentTxId,
            );
            const foundGeneral = txForUserA.body.find(
                (t: any) => t.id === generalTxId,
            );

            expect(foundEarning.created_by_user_id).toBe(userB.user.id);
            expect(foundExpense.created_by_user_id).toBe(userB.user.id);
            expect(foundInvestment.created_by_user_id).toBe(userB.user.id);
            expect(foundGeneral.created_by_user_id).toBe(userA.user.id);

            // 10. Real-time Symmetry: Both User A and User B query Event-Scoped Transactions
            const eventTxForUserA = await client
                .get(`/api/shops/${shopId}/transactions?event_id=${eventId}`)
                .set('Authorization', userA.bearerHeader);
            const eventTxForUserB = await client
                .get(`/api/shops/${shopId}/transactions?event_id=${eventId}`)
                .set('Authorization', userB.bearerHeader);

            expect(eventTxForUserA.status).toBe(200);
            expect(eventTxForUserB.status).toBe(200);
            expect(eventTxForUserA.body).toEqual(eventTxForUserB.body);
            expect(eventTxForUserA.body.length).toBe(3);

            // 11. Real-time Symmetry: Consolidated Shop Balance
            // Total Earnings: 5000 + 1000 = 6000
            // Total Expenses: 1800
            // Total Investments: 1200
            // Net Balance: 6000 - (1800 + 1200) = 3000
            const balanceForUserA = await client
                .get(`/api/shops/${shopId}/balance`)
                .set('Authorization', userA.bearerHeader);
            const balanceForUserB = await client
                .get(`/api/shops/${shopId}/balance`)
                .set('Authorization', userB.bearerHeader);

            expect(balanceForUserA.status).toBe(200);
            expect(balanceForUserB.status).toBe(200);
            expect(balanceForUserA.body).toEqual(balanceForUserB.body);

            expect(Number(balanceForUserA.body.earnings)).toBe(6000);
            expect(Number(balanceForUserA.body.expenses)).toBe(1800);
            expect(Number(balanceForUserA.body.investments)).toBe(1200);
            expect(Number(balanceForUserA.body.balance)).toBe(3000);

            // 12. Real-time Symmetry: Event-Scoped Balance
            // Event Earnings: 5000
            // Event Expenses: 1800
            // Event Investments: 1200
            // Event Net Balance: 5000 - (1800 + 1200) = 2000
            const eventBalanceForUserA = await client
                .get(`/api/shops/${shopId}/balance?event_id=${eventId}`)
                .set('Authorization', userA.bearerHeader);
            const eventBalanceForUserB = await client
                .get(`/api/shops/${shopId}/balance?event_id=${eventId}`)
                .set('Authorization', userB.bearerHeader);

            expect(eventBalanceForUserA.status).toBe(200);
            expect(eventBalanceForUserB.status).toBe(200);
            expect(eventBalanceForUserA.body).toEqual(
                eventBalanceForUserB.body,
            );

            expect(Number(eventBalanceForUserA.body.earnings)).toBe(5000);
            expect(Number(eventBalanceForUserA.body.expenses)).toBe(1800);
            expect(Number(eventBalanceForUserA.body.investments)).toBe(1200);
            expect(Number(eventBalanceForUserA.body.balance)).toBe(2000);
        });
    });

    describe('Strict Multi-Tenant Isolation', () => {
        it('should strictly deny User C in Shop 2 from reading, creating, updating, or deleting resources in Shop 1', async () => {
            // Setup User A in Shop 1
            const userA = await createAuthenticatedUser(client);
            const shop1Res = await client
                .post('/api/shops')
                .set('Authorization', userA.bearerHeader)
                .send({ name: 'Shop One' });
            const shop1Id = shop1Res.body.id;

            // Setup User C in Shop 2
            const userC = await createAuthenticatedUser(client);
            const shop2Res = await client
                .post('/api/shops')
                .set('Authorization', userC.bearerHeader)
                .send({ name: 'Shop Two' });
            const shop2Id = shop2Res.body.id;

            // User A creates an Event and Transaction in Shop 1
            const eventRes = await client
                .post(`/api/shops/${shop1Id}/events`)
                .set('Authorization', userA.bearerHeader)
                .send({
                    name: 'Shop 1 Event',
                    start_date: '2026-10-01T00:00:00.000Z',
                    end_date: '2026-10-02T00:00:00.000Z',
                });
            const shop1EventId = eventRes.body.id;

            const txRes = await client
                .post(`/api/shops/${shop1Id}/transactions`)
                .set('Authorization', userA.bearerHeader)
                .send({
                    name: 'Shop 1 Income',
                    amount: 999,
                    type: 'EARNING',
                    date: '2026-10-01T12:00:00.000Z',
                    event_id: shop1EventId,
                });
            const shop1TxId = txRes.body.id;

            // 1. User C cannot access Shop 1 directly
            const getShopRes = await client
                .get(`/api/shops/${shop1Id}`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(getShopRes.status);

            const updateShopRes = await client
                .patch(`/api/shops/${shop1Id}`)
                .set('Authorization', userC.bearerHeader)
                .send({ name: 'Hacked Shop' });
            expect([403, 404]).toContain(updateShopRes.status);

            const deleteShopRes = await client
                .delete(`/api/shops/${shop1Id}`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(deleteShopRes.status);

            // 2. User C cannot view or manage Shop 1 members or invitations
            const getMembersRes = await client
                .get(`/api/shops/${shop1Id}/members`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(getMembersRes.status);

            const inviteRes = await client
                .post(`/api/shops/${shop1Id}/invitations`)
                .set('Authorization', userC.bearerHeader)
                .send({ email: 'intruder@example.com', role: 'MEMBER' });
            expect([403, 404]).toContain(inviteRes.status);

            const getInvitesRes = await client
                .get(`/api/shops/${shop1Id}/invitations`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(getInvitesRes.status);

            // 3. User C cannot read or mutate Shop 1 events
            const listEventsRes = await client
                .get(`/api/shops/${shop1Id}/events`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(listEventsRes.status);

            const getEventRes = await client
                .get(`/api/shops/${shop1Id}/events/${shop1EventId}`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(getEventRes.status);

            const createEventRes = await client
                .post(`/api/shops/${shop1Id}/events`)
                .set('Authorization', userC.bearerHeader)
                .send({
                    name: 'Unauthorized Event',
                    start_date: '2026-10-01T00:00:00.000Z',
                    end_date: '2026-10-02T00:00:00.000Z',
                });
            expect([403, 404]).toContain(createEventRes.status);

            const updateEventRes = await client
                .patch(`/api/shops/${shop1Id}/events/${shop1EventId}`)
                .set('Authorization', userC.bearerHeader)
                .send({ name: 'Tampered Event Name' });
            expect([403, 404]).toContain(updateEventRes.status);

            const deleteEventRes = await client
                .delete(`/api/shops/${shop1Id}/events/${shop1EventId}`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(deleteEventRes.status);

            // 4. User C cannot read or mutate Shop 1 transactions
            const listTxRes = await client
                .get(`/api/shops/${shop1Id}/transactions`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(listTxRes.status);

            const getTxRes = await client
                .get(`/api/shops/${shop1Id}/transactions/${shop1TxId}`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(getTxRes.status);

            const createTxRes = await client
                .post(`/api/shops/${shop1Id}/transactions`)
                .set('Authorization', userC.bearerHeader)
                .send({
                    name: 'Unauthorized Transaction',
                    amount: 500,
                    type: 'EARNING',
                    date: '2026-10-01T12:00:00.000Z',
                });
            expect([403, 404]).toContain(createTxRes.status);

            const updateTxRes = await client
                .patch(`/api/shops/${shop1Id}/transactions/${shop1TxId}`)
                .set('Authorization', userC.bearerHeader)
                .send({ name: 'Tampered Tx Name' });
            expect([403, 404]).toContain(updateTxRes.status);

            const deleteTxRes = await client
                .delete(`/api/shops/${shop1Id}/transactions/${shop1TxId}`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(deleteTxRes.status);

            // 5. User C cannot access Shop 1 consolidated balance
            const balanceRes = await client
                .get(`/api/shops/${shop1Id}/balance`)
                .set('Authorization', userC.bearerHeader);
            expect([403, 404]).toContain(balanceRes.status);

            // 6. Cross-Tenant Cross-Resource Injection Guard:
            // User C attempts to create a transaction in Shop 2 referencing an Event in Shop 1
            const crossTenantTxRes = await client
                .post(`/api/shops/${shop2Id}/transactions`)
                .set('Authorization', userC.bearerHeader)
                .send({
                    name: 'Cross Tenant Event Injection',
                    amount: 250,
                    type: 'EXPENSE',
                    date: '2026-10-01T12:00:00.000Z',
                    event_id: shop1EventId,
                });
            expect([403, 404]).toContain(crossTenantTxRes.status);

            // 7. Conversely, User A cannot access Shop 2 resources
            const userAGetShop2 = await client
                .get(`/api/shops/${shop2Id}`)
                .set('Authorization', userA.bearerHeader);
            expect([403, 404]).toContain(userAGetShop2.status);

            const userAGetShop2Balance = await client
                .get(`/api/shops/${shop2Id}/balance`)
                .set('Authorization', userA.bearerHeader);
            expect([403, 404]).toContain(userAGetShop2Balance.status);
        });
    });

    describe('Deprecated Legacy Single-User Route Decommissioning', () => {
        it('should return 404 for deprecated single-user endpoints while user account endpoints remain intact', async () => {
            const authUser = await createAuthenticatedUser(client);

            // 1. Deprecated endpoints must return 404 Not Found
            const legacyEventsMe = await client
                .get('/api/events/me')
                .set('Authorization', authUser.bearerHeader);
            expect(legacyEventsMe.status).toBe(404);

            const legacyPostEventsMe = await client
                .post('/api/events/me')
                .set('Authorization', authUser.bearerHeader)
                .send({ name: 'Legacy Event' });
            expect(legacyPostEventsMe.status).toBe(404);

            const legacyTransactionsMe = await client
                .get('/api/transactions/me')
                .set('Authorization', authUser.bearerHeader);
            expect(legacyTransactionsMe.status).toBe(404);

            const legacyPostTransactionsMe = await client
                .post('/api/transactions/me')
                .set('Authorization', authUser.bearerHeader)
                .send({ name: 'Legacy Tx', amount: 100, type: 'EARNING' });
            expect(legacyPostTransactionsMe.status).toBe(404);

            const legacyUsersMeBalance = await client
                .get('/api/users/me/balance?from=2026-01-01&to=2026-12-31')
                .set('Authorization', authUser.bearerHeader);
            expect(legacyUsersMeBalance.status).toBe(404);

            // 2. User account management endpoints must remain intact
            // 2a. GET /api/users/me
            const profileRes = await client
                .get('/api/users/me')
                .set('Authorization', authUser.bearerHeader);
            expect(profileRes.status).toBe(200);
            expect(profileRes.body.id).toBe(authUser.user.id);
            expect(profileRes.body.email).toBe(authUser.user.email);

            // 2b. PATCH /api/users/me
            const updateRes = await client
                .patch('/api/users/me')
                .set('Authorization', authUser.bearerHeader)
                .send({ first_name: 'UpdatedName' });
            expect(updateRes.status).toBe(200);
            expect(updateRes.body.first_name).toBe('UpdatedName');

            // 2c. GET /api/users/me/accounts
            const accountsRes = await client
                .get('/api/users/me/accounts')
                .set('Authorization', authUser.bearerHeader);
            expect(accountsRes.status).toBe(200);
            expect(Array.isArray(accountsRes.body)).toBe(true);
        });
    });
});

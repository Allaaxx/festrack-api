import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';

describe('Shop Invitations Routes (Elysia E2E)', () => {
    const client = testClient(app);

    describe('POST /api/shops/:shopId/invitations', () => {
        it('should return 201 and create an invitation when requested by shop owner', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Bakery Co' });
            expect(shopRes.status).toBe(201);
            const shopId = shopRes.body.id;

            const inviteEmail = `invited_${Date.now()}@example.com`;
            const res = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    email: inviteEmail,
                    role: 'MEMBER',
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.shop_id).toBe(shopId);
            expect(res.body.email).toBe(inviteEmail.toLowerCase());
            expect(res.body.role).toBe('MEMBER');
            expect(res.body.token).toBeDefined();
            expect(res.body.status).toBe('PENDING');
            expect(res.body.expires_at).toBeDefined();

            // Expiration should be approximately 7 days from now
            const expiresAt = new Date(res.body.expires_at).getTime();
            const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
            expect(Math.abs(expiresAt - sevenDaysFromNow)).toBeLessThan(60000);
        });

        it('should refresh token and reset 7-day expiration when re-inviting an email with PENDING status', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Refresh Token Shop' });
            const shopId = shopRes.body.id;

            const inviteEmail = `refresh_${Date.now()}@example.com`;
            const firstInvite = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: inviteEmail, role: 'MEMBER' });
            expect(firstInvite.status).toBe(201);
            const initialToken = firstInvite.body.token;

            // Re-invite same email
            const secondInvite = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: inviteEmail, role: 'MEMBER' });

            expect(secondInvite.status).toBe(201);
            expect(secondInvite.body.id).toBe(firstInvite.body.id);
            expect(secondInvite.body.token).not.toBe(initialToken);
            expect(secondInvite.body.status).toBe('PENDING');
        });

        it('should return 403 when a non-owner member tries to create an invitation', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client, {
                email: `member_inviter_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Member Inviter Shop' });
            const shopId = shopRes.body.id;

            // Invite and accept to make memberUser a MEMBER
            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: memberUser.user.email, role: 'MEMBER' });
            expect(inviteRes.status).toBe(201);

            const acceptRes = await client
                .post(`/api/shops/invitations/${inviteRes.body.token}/accept`)
                .set('Authorization', memberUser.bearerHeader);
            expect(acceptRes.status).toBe(200);

            // Member attempts to invite someone else
            const res = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', memberUser.bearerHeader)
                .send({ email: 'someone_else@example.com', role: 'MEMBER' });

            expect(res.status).toBe(403);
        });

        it('should return 403 when an outsider tries to create an invitation', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Outsider Shop' });
            const shopId = shopRes.body.id;

            const res = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', outsider.bearerHeader)
                .send({ email: 'somebody@example.com', role: 'MEMBER' });

            expect(res.status).toBe(403);
        });

        it('should return 401 when unauthenticated', async () => {
            const res = await client
                .post(
                    '/api/shops/11111111-1111-1111-1111-111111111111/invitations',
                )
                .send({ email: 'test@example.com' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/shops/:shopId/invitations', () => {
        it('should return 200 and list pending invitations for shop owner', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'List Invites Shop' });
            const shopId = shopRes.body.id;

            const email1 = `pending1_${Date.now()}@example.com`;
            const email2 = `pending2_${Date.now()}@example.com`;

            await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: email1 });
            await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: email2 });

            const res = await client
                .get(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const found1 = res.body.find((inv: any) => inv.email === email1);
            const found2 = res.body.find((inv: any) => inv.email === email2);
            expect(found1).toBeDefined();
            expect(found2).toBeDefined();
            expect(found1.status).toBe('PENDING');
        });

        it('should return 403 when non-owner requests pending invitations', async () => {
            const owner = await createAuthenticatedUser(client);
            const other = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Forbidden Invites Shop' });
            const shopId = shopRes.body.id;

            const res = await client
                .get(`/api/shops/${shopId}/invitations`)
                .set('Authorization', other.bearerHeader);

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/shops/:shopId/invitations/:invitationId', () => {
        it('should allow owner to revoke a pending invitation', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Revoke Shop' });
            const shopId = shopRes.body.id;

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: `revokeme_${Date.now()}@example.com` });
            const invitationId = inviteRes.body.id;

            const revokeRes = await client
                .delete(`/api/shops/${shopId}/invitations/${invitationId}`)
                .set('Authorization', owner.bearerHeader);

            expect(revokeRes.status).toBe(200);

            // Invitation should no longer appear in pending list
            const listRes = await client
                .get(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader);
            const found = listRes.body.find(
                (inv: any) => inv.id === invitationId,
            );
            expect(found).toBeUndefined();
        });

        it('should return 403 if non-owner attempts to revoke invitation', async () => {
            const owner = await createAuthenticatedUser(client);
            const other = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Revoke Guard Shop' });
            const shopId = shopRes.body.id;

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: `revokeguard_${Date.now()}@example.com` });

            const revokeRes = await client
                .delete(`/api/shops/${shopId}/invitations/${inviteRes.body.id}`)
                .set('Authorization', other.bearerHeader);

            expect(revokeRes.status).toBe(403);
        });
    });

    describe('GET /api/shops/invitations/:token', () => {
        it('should return 200 with invitation and shop details for valid token', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Token Details Shop', description: 'Test Shop' });
            const shopId = shopRes.body.id;

            const inviteEmail = `token_details_${Date.now()}@example.com`;
            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: inviteEmail, role: 'MEMBER' });
            expect(inviteRes.status).toBe(201);
            const token = inviteRes.body.token;

            const res = await client.get(`/api/shops/invitations/${token}`);
            expect(res.status).toBe(200);
            expect(res.body.token).toBe(token);
            expect(res.body.email).toBe(inviteEmail.toLowerCase());
            expect(res.body.shop).toBeDefined();
            expect(res.body.shop.id).toBe(shopId);
            expect(res.body.shop.name).toBe('Token Details Shop');
            expect(res.body.shop.description).toBe('Test Shop');
        });

        it('should return 404 when invitation token does not exist', async () => {
            const res = await client.get(
                '/api/shops/invitations/non-existent-token',
            );
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Invitation not found.');
        });
    });

    describe('POST /api/shops/invitations/:token/accept', () => {
        it('should allow authenticated user to accept invitation when email strictly matches', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Acceptance Shop' });
            const shopId = shopRes.body.id;

            const inviteeEmail = `match_invitee_${Date.now()}@example.com`;
            const invitee = await createAuthenticatedUser(client, {
                email: inviteeEmail,
            });

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: inviteeEmail, role: 'MEMBER' });
            const token = inviteRes.body.token;

            const acceptRes = await client
                .post(`/api/shops/invitations/${token}/accept`)
                .set('Authorization', invitee.bearerHeader);

            expect(acceptRes.status).toBe(200);

            // Verify user is now a member of the shop
            const membersRes = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', invitee.bearerHeader);
            expect(membersRes.status).toBe(200);
            const foundMember = membersRes.body.find(
                (m: any) => m.user_id === invitee.user.id,
            );
            expect(foundMember).toBeDefined();
            expect(foundMember.role).toBe('MEMBER');
        });

        it('should return 403 Forbidden when authenticated user email does not match invitation recipient', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Mismatch Shop' });
            const shopId = shopRes.body.id;

            const intendedEmail = `intended_${Date.now()}@example.com`;
            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: intendedEmail, role: 'MEMBER' });
            const token = inviteRes.body.token;

            // Intruder tries to accept with different email
            const intruder = await createAuthenticatedUser(client, {
                email: `intruder_${Date.now()}@example.com`,
            });

            const acceptRes = await client
                .post(`/api/shops/invitations/${token}/accept`)
                .set('Authorization', intruder.bearerHeader);

            expect(acceptRes.status).toBe(403);
        });

        it('should return 400 or 404 when token is revoked', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Revoked Accept Shop' });
            const shopId = shopRes.body.id;

            const email = `revoked_accept_${Date.now()}@example.com`;
            const invitee = await createAuthenticatedUser(client, { email });

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email });
            const { id: invitationId, token } = inviteRes.body;

            // Revoke it
            await client
                .delete(`/api/shops/${shopId}/invitations/${invitationId}`)
                .set('Authorization', owner.bearerHeader);

            // Attempt accept
            const acceptRes = await client
                .post(`/api/shops/invitations/${token}/accept`)
                .set('Authorization', invitee.bearerHeader);

            expect([400, 404]).toContain(acceptRes.status);
        });

        it('should return 409 when user is already a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Already Member Shop' });
            const shopId = shopRes.body.id;

            const email = `already_member_${Date.now()}@example.com`;
            const invitee = await createAuthenticatedUser(client, { email });

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email });
            const { token } = inviteRes.body;

            // First accept succeeds
            const firstAccept = await client
                .post(`/api/shops/invitations/${token}/accept`)
                .set('Authorization', invitee.bearerHeader);
            expect(firstAccept.status).toBe(200);

            // Re-invite same email generates a new token
            const secondInvite = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email });
            expect(secondInvite.status).toBe(201);

            // Trying to accept while already a member throws 409
            const secondAccept = await client
                .post(
                    `/api/shops/invitations/${secondInvite.body.token}/accept`,
                )
                .set('Authorization', invitee.bearerHeader);
            expect(secondAccept.status).toBe(409);
            expect(secondAccept.body.message).toContain('already a member');
        });

        it('should return 404 when token does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const res = await client
                .post('/api/shops/invitations/non-existent-token/accept')
                .set('Authorization', user.bearerHeader);

            expect(res.status).toBe(404);
        });
    });
});

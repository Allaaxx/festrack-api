import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';

describe('Shop Members Routes (Elysia E2E)', () => {
    const client = testClient(app);

    describe('GET /api/shops/:shopId/members', () => {
        it('should list all members of the shop for an active member', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client, {
                email: `active_member_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Active Members Shop' });
            const shopId = shopRes.body.id;

            // Invite & accept
            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: memberUser.user.email, role: 'MEMBER' });

            await client
                .post(`/api/shops/invitations/${inviteRes.body.token}/accept`)
                .set('Authorization', memberUser.bearerHeader);

            // Member lists members
            const listRes = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', memberUser.bearerHeader);

            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body)).toBe(true);
            expect(listRes.body.length).toBe(2);

            const ownerMember = listRes.body.find(
                (m: any) => m.user_id === owner.user.id,
            );
            const regularMember = listRes.body.find(
                (m: any) => m.user_id === memberUser.user.id,
            );

            expect(ownerMember).toBeDefined();
            expect(ownerMember.role).toBe('OWNER');
            expect(regularMember).toBeDefined();
            expect(regularMember.role).toBe('MEMBER');
        });

        it('should return 403 when non-member requests shop members', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Private Shop' });
            const shopId = shopRes.body.id;

            const res = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', outsider.bearerHeader);

            expect(res.status).toBe(403);
        });

        it('should return 401 when unauthorized', async () => {
            const res = await client.get(
                '/api/shops/11111111-1111-1111-1111-111111111111/members',
            );
            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/shops/:shopId/members/:userId', () => {
        it('should allow owner to remove another member', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client, {
                email: `removee_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Removal Shop' });
            const shopId = shopRes.body.id;

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: memberUser.user.email, role: 'MEMBER' });

            await client
                .post(`/api/shops/invitations/${inviteRes.body.token}/accept`)
                .set('Authorization', memberUser.bearerHeader);

            const deleteRes = await client
                .delete(`/api/shops/${shopId}/members/${memberUser.user.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteRes.status).toBe(200);

            // Member can no longer access shop
            const checkRes = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', memberUser.bearerHeader);
            expect(checkRes.status).toBe(403);
        });

        it('should allow regular member to leave the shop voluntarily', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client, {
                email: `voluntary_leave_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Voluntary Leave Shop' });
            const shopId = shopRes.body.id;

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: memberUser.user.email, role: 'MEMBER' });

            await client
                .post(`/api/shops/invitations/${inviteRes.body.token}/accept`)
                .set('Authorization', memberUser.bearerHeader);

            // Member leaves
            const leaveRes = await client
                .delete(`/api/shops/${shopId}/members/${memberUser.user.id}`)
                .set('Authorization', memberUser.bearerHeader);

            expect(leaveRes.status).toBe(200);

            // Member is gone
            const checkRes = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', memberUser.bearerHeader);
            expect(checkRes.status).toBe(403);
        });

        it('should prevent sole owner from leaving without transferring ownership or deleting the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Sole Owner Shop' });
            const shopId = shopRes.body.id;

            const leaveRes = await client
                .delete(`/api/shops/${shopId}/members/${owner.user.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(leaveRes.status).toBe(400);
            expect(leaveRes.body.message).toContain('Sole owner cannot leave');
        });

        it('should return 403 when a regular member attempts to remove another member', async () => {
            const owner = await createAuthenticatedUser(client);
            const member1 = await createAuthenticatedUser(client, {
                email: `m1_${Date.now()}@example.com`,
            });
            const member2 = await createAuthenticatedUser(client, {
                email: `m2_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Member Hierarchy Shop' });
            const shopId = shopRes.body.id;

            const inv1 = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: member1.user.email, role: 'MEMBER' });
            await client
                .post(`/api/shops/invitations/${inv1.body.token}/accept`)
                .set('Authorization', member1.bearerHeader);

            const inv2 = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: member2.user.email, role: 'MEMBER' });
            await client
                .post(`/api/shops/invitations/${inv2.body.token}/accept`)
                .set('Authorization', member2.bearerHeader);

            // Member1 tries to delete member2
            const deleteRes = await client
                .delete(`/api/shops/${shopId}/members/${member2.user.id}`)
                .set('Authorization', member1.bearerHeader);

            expect(deleteRes.status).toBe(403);
        });
    });

    describe('POST /api/shops/:shopId/transfer-ownership', () => {
        it('should allow owner to transfer ownership to another member', async () => {
            const owner = await createAuthenticatedUser(client);
            const successor = await createAuthenticatedUser(client, {
                email: `successor_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Transfer Ownership Shop' });
            const shopId = shopRes.body.id;

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: successor.user.email, role: 'MEMBER' });

            await client
                .post(`/api/shops/invitations/${inviteRes.body.token}/accept`)
                .set('Authorization', successor.bearerHeader);

            const transferRes = await client
                .post(`/api/shops/${shopId}/transfer-ownership`)
                .set('Authorization', owner.bearerHeader)
                .send({ new_owner_user_id: successor.user.id });

            expect(transferRes.status).toBe(200);

            // Verify roles: successor is now OWNER, original owner is now MEMBER
            const membersRes = await client
                .get(`/api/shops/${shopId}/members`)
                .set('Authorization', successor.bearerHeader);
            expect(membersRes.status).toBe(200);

            const newOwner = membersRes.body.find(
                (m: any) => m.user_id === successor.user.id,
            );
            const oldOwner = membersRes.body.find(
                (m: any) => m.user_id === owner.user.id,
            );

            expect(newOwner.role).toBe('OWNER');
            expect(oldOwner.role).toBe('MEMBER');

            // Former owner can now leave the shop without sole owner restriction
            const leaveRes = await client
                .delete(`/api/shops/${shopId}/members/${owner.user.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(leaveRes.status).toBe(200);
        });

        it('should return 403 when non-owner tries to transfer ownership', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client, {
                email: `member_trans_${Date.now()}@example.com`,
            });

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Unauthorized Transfer Shop' });
            const shopId = shopRes.body.id;

            const inviteRes = await client
                .post(`/api/shops/${shopId}/invitations`)
                .set('Authorization', owner.bearerHeader)
                .send({ email: memberUser.user.email, role: 'MEMBER' });

            await client
                .post(`/api/shops/invitations/${inviteRes.body.token}/accept`)
                .set('Authorization', memberUser.bearerHeader);

            const transferRes = await client
                .post(`/api/shops/${shopId}/transfer-ownership`)
                .set('Authorization', memberUser.bearerHeader)
                .send({ new_owner_user_id: memberUser.user.id });

            expect(transferRes.status).toBe(403);
        });

        it('should return 404 when transferring ownership to a user not in the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);

            const shopRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Outsider Transfer Shop' });
            const shopId = shopRes.body.id;

            const transferRes = await client
                .post(`/api/shops/${shopId}/transfer-ownership`)
                .set('Authorization', owner.bearerHeader)
                .send({ new_owner_user_id: outsider.user.id });

            expect(transferRes.status).toBe(404);
        });
    });
});

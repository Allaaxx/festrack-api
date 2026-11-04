import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import { shopMembersTable } from '../db/postgres/schemas/index.js';

describe('Shops Routes (Elysia E2E)', () => {
    const client = testClient(app);

    describe('POST /api/shops', () => {
        it('should return 201 and create a shop with role OWNER for the creator', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Test Coffee Roasters',
                    description: 'Artisanal coffee and pastries',
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Test Coffee Roasters');
            expect(response.body.description).toBe(
                'Artisanal coffee and pastries',
            );
            expect(response.body.id).toBeDefined();
            expect(response.body.role).toBe('OWNER');
            expect(response.body.created_at).toBeDefined();
            expect(response.body.updated_at).toBeDefined();
        });

        it('should allow creating a shop with optional description omitted', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Minimal Shop',
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Minimal Shop');
            expect(response.body.description).toBeNull();
            expect(response.body.role).toBe('OWNER');
        });

        it('should return 401 when unauthorized', async () => {
            const response = await client.post('/api/shops').send({
                name: 'Unauthorized Shop',
            });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 when name is empty', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: '',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/shops', () => {
        it('should list all shops the authenticated user belongs to including their role', async () => {
            const user = await createAuthenticatedUser(client);

            const shop1Res = await client
                .post('/api/shops')
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Shop One' });
            expect(shop1Res.status).toBe(201);

            const shop2Res = await client
                .post('/api/shops')
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Shop Two' });
            expect(shop2Res.status).toBe(201);

            const listRes = await client
                .get('/api/shops')
                .set('Authorization', user.bearerHeader);

            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body)).toBe(true);
            expect(listRes.body.length).toBeGreaterThanOrEqual(2);

            const foundShop1 = listRes.body.find(
                (s: any) => s.id === shop1Res.body.id,
            );
            expect(foundShop1).toBeDefined();
            expect(foundShop1.name).toBe('Shop One');
            expect(foundShop1.role).toBe('OWNER');

            const foundShop2 = listRes.body.find(
                (s: any) => s.id === shop2Res.body.id,
            );
            expect(foundShop2).toBeDefined();
            expect(foundShop2.name).toBe('Shop Two');
            expect(foundShop2.role).toBe('OWNER');
        });

        it('should return empty array if user belongs to no shops', async () => {
            const newUser = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/shops')
                .set('Authorization', newUser.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return 401 when unauthorized', async () => {
            const response = await client.get('/api/shops');
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ message: 'Unauthorized' });
        });
    });

    describe('GET /api/shops/:shopId', () => {
        it('should return shop details for an active OWNER', async () => {
            const owner = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Coffee Lab',
                    description: 'Specialty espresso',
                });

            const shopId = createRes.body.id;

            const getRes = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(shopId);
            expect(getRes.body.name).toBe('Coffee Lab');
            expect(getRes.body.description).toBe('Specialty espresso');
        });

        it('should return shop details for an active MEMBER', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Shared Roastery' });

            const shopId = createRes.body.id;

            await db.insert(shopMembersTable).values({
                shop_id: shopId,
                user_id: memberUser.user.id,
                role: 'MEMBER',
            });

            const getRes = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', memberUser.bearerHeader);

            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(shopId);
            expect(getRes.body.name).toBe('Shared Roastery');
        });

        it('should return 404 when shop does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentId = crypto.randomUUID();

            const response = await client
                .get(`/api/shops/${nonExistentId}`)
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const otherUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Private Shop' });

            const shopId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', otherUser.bearerHeader);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/shops/invalid-uuid')
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /api/shops/:shopId', () => {
        it('should allow OWNER to update shop metadata', async () => {
            const owner = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Old Shop Name',
                    description: 'Old Description',
                });

            const shopId = createRes.body.id;

            const patchRes = await client
                .patch(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Updated Shop Name',
                    description: 'Updated Description',
                });

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.id).toBe(shopId);
            expect(patchRes.body.name).toBe('Updated Shop Name');
            expect(patchRes.body.description).toBe('Updated Description');
        });

        it('should return 403 Forbidden when MEMBER role tries to update shop metadata', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Owner Controlled Shop' });

            const shopId = createRes.body.id;

            await db.insert(shopMembersTable).values({
                shop_id: shopId,
                user_id: memberUser.user.id,
                role: 'MEMBER',
            });

            const patchRes = await client
                .patch(`/api/shops/${shopId}`)
                .set('Authorization', memberUser.bearerHeader)
                .send({ name: 'Member Attempted Name' });

            expect(patchRes.status).toBe(403);
            expect(patchRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 403 when non-member tries to update shop metadata', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Owner Shop' });

            const shopId = createRes.body.id;

            const patchRes = await client
                .patch(`/api/shops/${shopId}`)
                .set('Authorization', nonMember.bearerHeader)
                .send({ name: 'Hacked Shop' });

            expect(patchRes.status).toBe(403);
            expect(patchRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 404 when updating non-existent shop', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentId = crypto.randomUUID();

            const response = await client
                .patch(`/api/shops/${nonExistentId}`)
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Does Not Exist' });

            expect(response.status).toBe(404);
        });

        it('should return 400 when updating with invalid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .patch('/api/shops/not-a-uuid')
                .set('Authorization', user.bearerHeader)
                .send({ name: 'Invalid' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/shops/:shopId', () => {
        it('should allow OWNER to delete the shop and cascade member removal', async () => {
            const owner = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Shop To Delete' });

            const shopId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.id).toBe(shopId);

            // Fetching deleted shop should now return 404
            const getRes = await client
                .get(`/api/shops/${shopId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(404);
        });

        it('should return 403 Forbidden when MEMBER role tries to delete shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Owner Delete Shop' });

            const shopId = createRes.body.id;

            await db.insert(shopMembersTable).values({
                shop_id: shopId,
                user_id: memberUser.user.id,
                role: 'MEMBER',
            });

            const deleteRes = await client
                .delete(`/api/shops/${shopId}`)
                .set('Authorization', memberUser.bearerHeader);

            expect(deleteRes.status).toBe(403);
            expect(deleteRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 403 when non-member tries to delete shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);

            const createRes = await client
                .post('/api/shops')
                .set('Authorization', owner.bearerHeader)
                .send({ name: 'Protected Shop' });

            const shopId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shopId}`)
                .set('Authorization', nonMember.bearerHeader);

            expect(deleteRes.status).toBe(403);
            expect(deleteRes.body).toEqual({ message: 'Forbidden' });
        });

        it('should return 404 when deleting non-existent shop', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentId = crypto.randomUUID();

            const response = await client
                .delete(`/api/shops/${nonExistentId}`)
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 400 when delete called with invalid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .delete('/api/shops/not-a-uuid')
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(400);
        });
    });
});

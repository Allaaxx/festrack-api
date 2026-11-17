import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import {
    eventTagsTable,
    shopMembersTable,
} from '../db/postgres/schemas/index.js';

describe('Shop-Scoped Event Tags Routes (Elysia E2E)', () => {
    const client = testClient(app);

    const createShop = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Event Tag Test Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', owner.bearerHeader)
            .send({ name, description: 'Shop for event tag testing' });
        return response.body;
    };

    const addMemberToShop = async (
        shopId: string,
        userId: string,
        role: 'OWNER' | 'MEMBER' = 'MEMBER',
    ) => {
        await db.insert(shopMembersTable).values({
            shop_id: shopId,
            user_id: userId,
            role,
        });
    };

    describe('GET /api/shops/:shopId/event-tags', () => {
        it('should return 200 and an empty array when shop has no custom tags for shop OWNER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(0);
            expect(response.body).toEqual([]);
        });

        it('should return 200 and an empty array when shop has no custom tags for a shop MEMBER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const member = await createAuthenticatedUser(client);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return only shop custom tags without system default tags', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Directly insert a custom event tag in the database
            const [customTag] = await db
                .insert(eventTagsTable)
                .values({
                    shop_id: shop.id,
                    name: 'Workshop VIP',
                    slug: 'workshop-vip',
                    color: 'bg-rose-500',
                })
                .returning();

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);

            const foundCustom = response.body[0];
            expect(foundCustom).toMatchObject({
                id: customTag.id,
                shop_id: shop.id,
                name: 'Workshop VIP',
                slug: 'workshop-vip',
                color: 'bg-rose-500',
            });
            expect(foundCustom.is_system).toBeUndefined();
        });

        it('should not return custom event tags from other shops (tenant isolation)', async () => {
            const ownerA = await createAuthenticatedUser(client);
            const shopA = await createShop(ownerA, 'Shop A');

            const ownerB = await createAuthenticatedUser(client);
            const shopB = await createShop(ownerB, 'Shop B');

            // Insert custom tag in Shop A
            await db.insert(eventTagsTable).values({
                shop_id: shopA.id,
                name: 'Shop A Exclusive',
                slug: 'exclusive-a',
                color: 'bg-teal-500',
            });

            // Query from Shop B
            const responseB = await client
                .get(`/api/shops/${shopB.id}/event-tags`)
                .set('Authorization', ownerB.bearerHeader);

            expect(responseB.status).toBe(200);
            const slugsB = responseB.body.map((t: any) => t.slug);
            expect(slugsB).not.toContain('exclusive-a');
        });

        it('should return 401 when request is not authenticated', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client.get(
                `/api/shops/${shop.id}/event-tags`,
            );

            expect(response.status).toBe(401);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const stranger = await createAuthenticatedUser(client);

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', stranger.bearerHeader);

            expect(response.status).toBe(403);
        });

        it('should return 404 when shop does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentShopId = '00000000-0000-4000-8000-000000000000';

            const response = await client
                .get(`/api/shops/${nonExistentShopId}/event-tags`)
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const user = await createAuthenticatedUser(client);

            const response = await client
                .get('/api/shops/invalid-uuid/event-tags')
                .set('Authorization', user.bearerHeader);

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/shops/:shopId/event-tags', () => {
        it('should return 201 and create custom event tag with derived kebab-case slug for OWNER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Aniversário de 15 Anos',
                    color: 'bg-emerald-500',
                });

            expect(response.status).toBe(201);
            expect(response.body).toMatchObject({
                shop_id: shop.id,
                name: 'Aniversário de 15 Anos',
                slug: 'aniversario-de-15-anos',
                color: 'bg-emerald-500',
            });
            expect(response.body.is_system).toBeUndefined();
            expect(response.body.id).toBeDefined();
            expect(response.body.created_at).toBeDefined();
        });

        it('should return 201 and allow MEMBER role to create custom event tag', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const member = await createAuthenticatedUser(client);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const response = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', member.bearerHeader)
                .send({
                    name: 'Reunião Semanal',
                    color: 'bg-indigo-500',
                });

            expect(response.status).toBe(201);
            expect(response.body.slug).toBe('reuniao-semanal');
            expect(response.body.is_system).toBeUndefined();
        });

        it('should return 201 and accept an explicit slug normalized to kebab-case', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Corporate Gala Dinner',
                    color: 'bg-blue-500',
                    slug: '  Corporate--Gala!!  ',
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Corporate Gala Dinner');
            expect(response.body.slug).toBe('corporate-gala');
        });

        it('should return 409 when slug conflicts with a built-in system default tag', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Attempt colliding with 'family' (via derived slug)
            const responseFamily = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Family',
                    color: 'bg-emerald-500',
                });
            expect(responseFamily.status).toBe(409);
            expect(responseFamily.body.message).toContain('family');

            // Attempt colliding with 'holiday' (via explicit slug)
            const responseHoliday = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'My Holiday Event',
                    color: 'bg-amber-500',
                    slug: 'holiday',
                });
            expect(responseHoliday.status).toBe(409);
            expect(responseHoliday.body.message).toContain('holiday');

            // Attempt colliding with 'business'
            const responseBusiness = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Business Gathering',
                    color: 'bg-blue-500',
                    slug: 'BUSINESS',
                });
            expect(responseBusiness.status).toBe(409);

            // Attempt colliding with 'personal'
            const responsePersonal = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Personal Space',
                    color: 'bg-purple-500',
                    slug: 'personal',
                });
            expect(responsePersonal.status).toBe(409);

            // Attempt colliding with 'etc'
            const responseEtc = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Etc',
                    color: 'bg-slate-500',
                });
            expect(responseEtc.status).toBe(409);
        });

        it('should return 409 when slug already exists in the same shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const first = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Conference VIP',
                    color: 'bg-cyan-500',
                });
            expect(first.status).toBe(201);

            // Duplicate by name -> slug 'conference-vip'
            const duplicate = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Conference VIP',
                    color: 'bg-cyan-500',
                });
            expect(duplicate.status).toBe(409);

            // Duplicate by explicit slug -> 'conference-vip'
            const duplicateSlug = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Another Conference VIP',
                    color: 'bg-red-500',
                    slug: 'conference-vip',
                });
            expect(duplicateSlug.status).toBe(409);
        });

        it('should return 400 when name or slug normalizes to an empty string', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const resEmptyName = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: '???',
                    color: 'bg-emerald-500',
                });
            expect(resEmptyName.status).toBe(400);
            expect(resEmptyName.body.message).toBe(
                'Event tag slug cannot be empty or invalid.',
            );

            const resEmptySlug = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Special Tag',
                    color: 'bg-blue-500',
                    slug: '---',
                });
            expect(resEmptySlug.status).toBe(400);
            expect(resEmptySlug.body.message).toBe(
                'Event tag slug cannot be empty or invalid.',
            );
        });

        it('should allow same slug in different shop (cross-tenant non-conflict)', async () => {
            const ownerA = await createAuthenticatedUser(client);
            const shopA = await createShop(ownerA, 'Shop Alpha');

            const ownerB = await createAuthenticatedUser(client);
            const shopB = await createShop(ownerB, 'Shop Beta');

            const resA = await client
                .post(`/api/shops/${shopA.id}/event-tags`)
                .set('Authorization', ownerA.bearerHeader)
                .send({
                    name: 'Shared Tag Name',
                    color: 'bg-pink-500',
                });
            expect(resA.status).toBe(201);
            expect(resA.body.slug).toBe('shared-tag-name');

            const resB = await client
                .post(`/api/shops/${shopB.id}/event-tags`)
                .set('Authorization', ownerB.bearerHeader)
                .send({
                    name: 'Shared Tag Name',
                    color: 'bg-pink-500',
                });
            expect(resB.status).toBe(201);
            expect(resB.body.slug).toBe('shared-tag-name');
        });

        it('should return 401 when unauthenticated', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .send({
                    name: 'No Auth Tag',
                    color: 'bg-red-500',
                });

            expect(response.status).toBe(401);
        });

        it('should return 403 when user is not a shop member', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const stranger = await createAuthenticatedUser(client);

            const response = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', stranger.bearerHeader)
                .send({
                    name: 'Stranger Tag',
                    color: 'bg-red-500',
                });

            expect(response.status).toBe(403);
        });

        it('should return 404 when shop does not exist', async () => {
            const user = await createAuthenticatedUser(client);
            const nonExistentShopId = '00000000-0000-4000-8000-000000000000';

            const response = await client
                .post(`/api/shops/${nonExistentShopId}/event-tags`)
                .set('Authorization', user.bearerHeader)
                .send({
                    name: 'Lost Tag',
                    color: 'bg-red-500',
                });

            expect(response.status).toBe(404);
        });

        it('should return 400 when body validation fails', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Empty name
            const resEmptyName = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: '',
                    color: 'bg-blue-500',
                });
            expect(resEmptyName.status).toBe(400);

            // Name too long (> 50)
            const resLongName = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'a'.repeat(51),
                    color: 'bg-blue-500',
                });
            expect(resLongName.status).toBe(400);

            // Empty color
            const resEmptyColor = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Valid Name',
                    color: '',
                });
            expect(resEmptyColor.status).toBe(400);

            // Color too long (> 30)
            const resLongColor = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Valid Name',
                    color: 'c'.repeat(31),
                });
            expect(resLongColor.status).toBe(400);

            // Slug too long (> 50)
            const resLongSlug = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Valid Name',
                    color: 'bg-blue-500',
                    slug: 's'.repeat(51),
                });
            expect(resLongSlug.status).toBe(400);

            // Additional properties forbidden
            const resExtraProp = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Valid Name',
                    color: 'bg-blue-500',
                    extra: 'not allowed',
                });
            expect(resExtraProp.status).toBe(400);
        });
    });

    describe('DELETE /api/shops/:shopId/event-tags/:tagId', () => {
        it('should return 200 and delete custom event tag for shop OWNER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Custom Party',
                    color: 'bg-emerald-500',
                    slug: 'custom-party',
                });
            expect(createRes.status).toBe(201);
            const createdTagId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shop.id}/event-tags/${createdTagId}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.id).toBe(createdTagId);
            expect(deleteRes.body.slug).toBe('custom-party');

            const listRes = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader);
            expect(listRes.status).toBe(200);
            const tagIds = listRes.body.map((t: any) => t.id);
            expect(tagIds).not.toContain(createdTagId);
        });

        it('should return 200 and delete custom event tag for shop MEMBER', async () => {
            const owner = await createAuthenticatedUser(client);
            const member = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const createRes = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Member Tag',
                    color: 'bg-purple-500',
                });
            expect(createRes.status).toBe(201);
            const createdTagId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shop.id}/event-tags/${createdTagId}`)
                .set('Authorization', member.bearerHeader);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.id).toBe(createdTagId);
        });

        it('should automatically reassign shop events referencing the deleted tag slug to etc', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Create custom tag 'festival-verao'
            const createTagRes = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Festival de Verão',
                    slug: 'festival-verao',
                    color: 'bg-yellow-500',
                });
            expect(createTagRes.status).toBe(201);
            const tagId = createTagRes.body.id;

            // Create two events referencing 'festival-verao'
            const evt1Res = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Show de Abertura',
                    start_date: '2026-10-01T10:00:00.000Z',
                    end_date: '2026-10-01T12:00:00.000Z',
                    tag: 'festival-verao',
                });
            expect(evt1Res.status).toBe(201);
            expect(evt1Res.body.tag).toBe('festival-verao');

            const evt2Res = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Show Principal',
                    start_date: '2026-10-02T20:00:00.000Z',
                    end_date: '2026-10-02T23:00:00.000Z',
                    tag: 'festival-verao',
                });
            expect(evt2Res.status).toBe(201);
            expect(evt2Res.body.tag).toBe('festival-verao');

            // Create one event with 'business' tag
            const evt3Res = await client
                .post(`/api/shops/${shop.id}/events`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Reunião de Alinhamento',
                    start_date: '2026-10-03T10:00:00.000Z',
                    end_date: '2026-10-03T11:00:00.000Z',
                    tag: 'business',
                });
            expect(evt3Res.status).toBe(201);
            expect(evt3Res.body.tag).toBe('business');

            // Delete the custom tag
            const deleteRes = await client
                .delete(`/api/shops/${shop.id}/event-tags/${tagId}`)
                .set('Authorization', owner.bearerHeader);
            expect(deleteRes.status).toBe(200);

            // Check events now have fallback tag 'etc'
            const getEvt1 = await client
                .get(`/api/shops/${shop.id}/events/${evt1Res.body.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(getEvt1.status).toBe(200);
            expect(getEvt1.body.tag).toBe('etc');

            const getEvt2 = await client
                .get(`/api/shops/${shop.id}/events/${evt2Res.body.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(getEvt2.status).toBe(200);
            expect(getEvt2.body.tag).toBe('etc');

            // Check business event remains unaffected
            const getEvt3 = await client
                .get(`/api/shops/${shop.id}/events/${evt3Res.body.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(getEvt3.status).toBe(200);
            expect(getEvt3.body.tag).toBe('business');
        });

        it('should return 400 when attempting to delete a system default tag ID', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const systemIds = [
                'system-family',
                'system-business',
                'system-personal',
                'system-holiday',
                'system-etc',
            ];

            for (const sysId of systemIds) {
                const response = await client
                    .delete(`/api/shops/${shop.id}/event-tags/${sysId}`)
                    .set('Authorization', owner.bearerHeader);

                expect(response.status).toBe(400);
            }
        });

        it('should return 404 when tag does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .delete(`/api/shops/${shop.id}/event-tags/non-existent-tag-id`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);

            const systemUnknownResponse = await client
                .delete(`/api/shops/${shop.id}/event-tags/system-unknown`)
                .set('Authorization', owner.bearerHeader);

            expect(systemUnknownResponse.status).toBe(404);
        });

        it('should return 404 when tag belongs to another shop (isolation)', async () => {
            const ownerA = await createAuthenticatedUser(client);
            const ownerB = await createAuthenticatedUser(client);
            const shopA = await createShop(ownerA, 'Shop A');
            const shopB = await createShop(ownerB, 'Shop B');

            const tagBRes = await client
                .post(`/api/shops/${shopB.id}/event-tags`)
                .set('Authorization', ownerB.bearerHeader)
                .send({
                    name: 'Tag in Shop B',
                    color: 'bg-red-500',
                });
            expect(tagBRes.status).toBe(201);
            const tagBId = tagBRes.body.id;

            // Attempt to delete tagB through shopA
            const response = await client
                .delete(`/api/shops/${shopA.id}/event-tags/${tagBId}`)
                .set('Authorization', ownerA.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 404 when shop does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonExistentShopId = '00000000-0000-4000-8000-000000000000';

            const response = await client
                .delete(
                    `/api/shops/${nonExistentShopId}/event-tags/some-tag-id`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 401 when unauthenticated', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client.delete(
                `/api/shops/${shop.id}/event-tags/any-tag-id`,
            );

            expect(response.status).toBe(401);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const stranger = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createTagRes = await client
                .post(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Owner Tag',
                    color: 'bg-indigo-500',
                });
            expect(createTagRes.status).toBe(201);
            const tagId = createTagRes.body.id;

            const response = await client
                .delete(`/api/shops/${shop.id}/event-tags/${tagId}`)
                .set('Authorization', stranger.bearerHeader);

            expect(response.status).toBe(403);
        });
    });
});

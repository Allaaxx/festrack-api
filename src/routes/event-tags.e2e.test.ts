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
        it('should return 200 and list the 5 built-in system default tags for shop OWNER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(5);

            const slugs = response.body.map((t: any) => t.slug);
            expect(slugs).toContain('family');
            expect(slugs).toContain('business');
            expect(slugs).toContain('personal');
            expect(slugs).toContain('holiday');
            expect(slugs).toContain('etc');

            const familyTag = response.body.find(
                (t: any) => t.slug === 'family',
            );
            expect(familyTag).toMatchObject({
                name: 'Família',
                slug: 'family',
                color: 'bg-emerald-500',
                is_system: true,
                shop_id: shop.id,
            });

            const businessTag = response.body.find(
                (t: any) => t.slug === 'business',
            );
            expect(businessTag).toMatchObject({
                name: 'Negócios',
                slug: 'business',
                color: 'bg-blue-500',
                is_system: true,
                shop_id: shop.id,
            });

            const personalTag = response.body.find(
                (t: any) => t.slug === 'personal',
            );
            expect(personalTag).toMatchObject({
                name: 'Pessoal',
                slug: 'personal',
                color: 'bg-purple-500',
                is_system: true,
                shop_id: shop.id,
            });

            const holidayTag = response.body.find(
                (t: any) => t.slug === 'holiday',
            );
            expect(holidayTag).toMatchObject({
                name: 'Feriado',
                slug: 'holiday',
                color: 'bg-amber-500',
                is_system: true,
                shop_id: shop.id,
            });

            const etcTag = response.body.find((t: any) => t.slug === 'etc');
            expect(etcTag).toMatchObject({
                name: 'Outros',
                slug: 'etc',
                color: 'bg-slate-500',
                is_system: true,
                shop_id: shop.id,
            });
        });

        it('should return 200 with system tags for a shop MEMBER', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const member = await createAuthenticatedUser(client);
            await addMemberToShop(shop.id, member.user.id, 'MEMBER');

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', member.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(5);
        });

        it('should merge system default tags with existing shop custom tags', async () => {
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
                    is_system: false,
                })
                .returning();

            const response = await client
                .get(`/api/shops/${shop.id}/event-tags`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(6);

            const foundCustom = response.body.find(
                (t: any) => t.slug === 'workshop-vip',
            );
            expect(foundCustom).toBeDefined();
            expect(foundCustom).toMatchObject({
                id: customTag.id,
                shop_id: shop.id,
                name: 'Workshop VIP',
                slug: 'workshop-vip',
                color: 'bg-rose-500',
                is_system: false,
            });
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
                is_system: false,
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
                is_system: false,
            });
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
            expect(response.body.is_system).toBe(false);
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
});

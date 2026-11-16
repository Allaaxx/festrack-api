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
});

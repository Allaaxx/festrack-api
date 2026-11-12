import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { db } from '../db/postgres/index.js';
import { shopMembersTable } from '../db/postgres/schemas/index.js';
import { faker } from '@faker-js/faker';

describe('Shop-Scoped Products Routes (Elysia E2E)', () => {
    const client = testClient(app);

    const createShop = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Product Test Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', owner.bearerHeader)
            .send({ name, description: 'Shop for product testing' });
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

    describe('POST /api/shops/:shopId/products', () => {
        it('should return 201 and create a product with type sale and stock record with specified quantity', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const payload = {
                name: 'Vintage Party Chair',
                slug: `vintage-party-chair-${faker.string.alphanumeric(8)}`,
                type: 'sale',
                price: 49.99,
                description: 'Classic wooden chair for events',
                images: ['https://example.com/chair.jpg'],
                initial_quantity: 25,
            };

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send(payload);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.name).toBe(payload.name);
            expect(response.body.slug).toBe(payload.slug);
            expect(response.body.type).toBe('sale');
            expect(Number(response.body.price)).toBe(49.99);
            expect(response.body.description).toBe(payload.description);
            expect(response.body.images).toEqual(payload.images);
            expect(response.body.is_bundle).toBe(false);
            expect(response.body.stock).toBeDefined();
            expect(response.body.stock.quantity).toBe(25);
            expect(response.body.stock.reserved).toBe(0);
        });

        it('should return 201 and create a product with type rent and stock record with specified quantity', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const payload = {
                name: 'Wedding Arch',
                slug: `wedding-arch-${faker.string.alphanumeric(8)}`,
                type: 'rent',
                price: 150.0,
                description: 'Rustic wooden arch for wedding ceremonies',
                images: ['https://example.com/arch.jpg'],
                quantity: 5,
            };

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send(payload);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.type).toBe('rent');
            expect(response.body.stock).toBeDefined();
            expect(response.body.stock.quantity).toBe(5);
            expect(response.body.stock.reserved).toBe(0);
        });

        it('should return 201 and create a product with type service without a stock record', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const payload = {
                name: 'Event Photography Session',
                slug: `photography-session-${faker.string.alphanumeric(8)}`,
                type: 'service',
                price: 300.0,
                description: '4 hours photo coverage',
                images: [],
            };

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send(payload);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.type).toBe('service');
            expect(response.body.stock).toBeNull();
        });

        it('should allow shop MEMBER to create products', async () => {
            const owner = await createAuthenticatedUser(client);
            const memberUser = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            await addMemberToShop(shop.id, memberUser.user.id, 'MEMBER');

            const payload = {
                name: 'Member Added Product',
                slug: `member-product-${faker.string.alphanumeric(8)}`,
                type: 'sale',
                price: 10.0,
                initial_quantity: 10,
            };

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', memberUser.bearerHeader)
                .send(payload);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
        });

        it('should return 409 when slug already exists', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const slug = `duplicate-slug-${faker.string.alphanumeric(8)}`;

            await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'First Product',
                    slug,
                    type: 'service',
                    price: 50.0,
                });

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Second Product With Same Slug',
                    slug,
                    type: 'sale',
                    price: 60.0,
                    initial_quantity: 5,
                });

            expect(response.status).toBe(409);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonMember = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', nonMember.bearerHeader)
                .send({
                    name: 'Unauthorized Product',
                    slug: `unauthorized-product-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                });

            expect(response.status).toBe(403);
        });

        it('should return 404 when shop does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const nonExistentShopId = faker.string.uuid();

            const response = await client
                .post(`/api/shops/${nonExistentShopId}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Ghost Product',
                    slug: `ghost-product-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                });

            expect(response.status).toBe(404);
        });

        it('should return 401 when request is not authenticated', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .send({
                    name: 'No Auth Product',
                    slug: 'no-auth-product',
                    type: 'sale',
                    price: 20.0,
                });

            expect(response.status).toBe(401);
        });

        it('should return 400 when shopId is not a valid UUID', async () => {
            const owner = await createAuthenticatedUser(client);

            const response = await client
                .post('/api/shops/not-a-valid-uuid/products')
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Invalid Shop ID',
                    slug: 'invalid-shop-id',
                    type: 'sale',
                    price: 20.0,
                });

            expect(response.status).toBe(400);
        });

        it('should return 400 when type is invalid', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Invalid Type Product',
                    slug: `invalid-type-${faker.string.alphanumeric(8)}`,
                    type: 'invalid-type',
                    price: 20.0,
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/shops/:shopId/products', () => {
        it('should return 200 and list all products for the shop with their stock', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Sale Item',
                    slug: `sale-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 15.0,
                    initial_quantity: 10,
                });

            await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Service Item',
                    slug: `service-item-${faker.string.alphanumeric(8)}`,
                    type: 'service',
                    price: 100.0,
                });

            const response = await client
                .get(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);

            const saleItem = response.body.find((p: any) => p.type === 'sale');
            expect(saleItem).toBeDefined();
            expect(saleItem.stock).toBeDefined();
            expect(saleItem.stock.quantity).toBe(10);

            const serviceItem = response.body.find(
                (p: any) => p.type === 'service',
            );
            expect(serviceItem).toBeDefined();
            expect(serviceItem.stock).toBeNull();
        });

        it('should filter products by type when type query parameter is provided', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Sale Only Item',
                    slug: `sale-only-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 25.0,
                    initial_quantity: 4,
                });

            await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Rent Only Item',
                    slug: `rent-only-${faker.string.alphanumeric(8)}`,
                    type: 'rent',
                    price: 75.0,
                    initial_quantity: 2,
                });

            const saleResponse = await client
                .get(`/api/shops/${shop.id}/products?type=sale`)
                .set('Authorization', owner.bearerHeader);

            expect(saleResponse.status).toBe(200);
            expect(saleResponse.body.length).toBe(1);
            expect(saleResponse.body[0].type).toBe('sale');

            const rentResponse = await client
                .get(`/api/shops/${shop.id}/products?type=rent`)
                .set('Authorization', owner.bearerHeader);

            expect(rentResponse.status).toBe(200);
            expect(rentResponse.body.length).toBe(1);
            expect(rentResponse.body[0].type).toBe('rent');
        });

        it('should not return products belonging to other shops', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop 1');
            const shop2 = await createShop(owner2, 'Shop 2');

            await client
                .post(`/api/shops/${shop1.id}/products`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    name: 'Shop 1 Item',
                    slug: `shop-1-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 10.0,
                    initial_quantity: 5,
                });

            await client
                .post(`/api/shops/${shop2.id}/products`)
                .set('Authorization', owner2.bearerHeader)
                .send({
                    name: 'Shop 2 Item',
                    slug: `shop-2-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                    initial_quantity: 8,
                });

            const response = await client
                .get(`/api/shops/${shop1.id}/products`)
                .set('Authorization', owner1.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Shop 1 Item');
        });

        it('should return 403 when user is not a shop member', async () => {
            const owner = await createAuthenticatedUser(client);
            const otherUser = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const response = await client
                .get(`/api/shops/${shop.id}/products`)
                .set('Authorization', otherUser.bearerHeader);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/shops/:shopId/products/:id', () => {
        it('should return 200 and product details including stock information', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Table Cloth',
                    slug: `table-cloth-${faker.string.alphanumeric(8)}`,
                    type: 'rent',
                    price: 12.5,
                    description: 'White linen table cloth',
                    initial_quantity: 50,
                });

            const productId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shop.id}/products/${productId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(productId);
            expect(response.body.shop_id).toBe(shop.id);
            expect(response.body.name).toBe('Table Cloth');
            expect(response.body.stock).toBeDefined();
            expect(response.body.stock.quantity).toBe(50);
            expect(response.body.stock.reserved).toBe(0);
        });

        it('should return 404 when product belongs to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop 1');
            const shop2 = await createShop(owner2, 'Shop 2');

            const createRes = await client
                .post(`/api/shops/${shop1.id}/products`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    name: 'Shop 1 Item',
                    slug: `shop-1-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 15.0,
                    initial_quantity: 10,
                });

            const productId = createRes.body.id;

            const response = await client
                .get(`/api/shops/${shop2.id}/products/${productId}`)
                .set('Authorization', owner2.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 404 when product does not exist', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const nonExistentProductId = faker.string.uuid();

            const response = await client
                .get(`/api/shops/${shop.id}/products/${nonExistentProductId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/shops/:shopId/products/:id', () => {
        it('should return 200 and delete a product, cascading deletion to its stock record', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Discontinued Item',
                    slug: `discontinued-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 5.0,
                    initial_quantity: 100,
                });

            const productId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shop.id}/products/${productId}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteRes.status).toBe(200);

            // Verify product is gone
            const getRes = await client
                .get(`/api/shops/${shop.id}/products/${productId}`)
                .set('Authorization', owner.bearerHeader);

            expect(getRes.status).toBe(404);
        });

        it('should return 404 when trying to delete a product belonging to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop 1');
            const shop2 = await createShop(owner2, 'Shop 2');

            const createRes = await client
                .post(`/api/shops/${shop1.id}/products`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    name: 'Shop 1 Item To Delete',
                    slug: `shop-1-del-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 15.0,
                });

            const productId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shop2.id}/products/${productId}`)
                .set('Authorization', owner2.bearerHeader);

            expect(deleteRes.status).toBe(404);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const stranger = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const createRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Protected Item',
                    slug: `protected-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 15.0,
                });

            const productId = createRes.body.id;

            const deleteRes = await client
                .delete(`/api/shops/${shop.id}/products/${productId}`)
                .set('Authorization', stranger.bearerHeader);

            expect(deleteRes.status).toBe(403);
        });
    });
});

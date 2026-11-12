import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/postgres/index.js';
import { shopMembersTable, stock } from '../db/postgres/schemas/index.js';
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

        it('should return 201 and create a bundle product with 2 component products without a stock record', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const comp1 = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Component 1',
                    slug: `comp-1-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                    initial_quantity: 10,
                });

            const comp2 = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Component 2',
                    slug: `comp-2-${faker.string.alphanumeric(8)}`,
                    type: 'rent',
                    price: 15.0,
                    quantity: 5,
                });

            const bundlePayload = {
                name: 'Party Package Bundle',
                slug: `party-package-${faker.string.alphanumeric(8)}`,
                type: 'sale',
                price: 99.99,
                description: 'Complete party bundle',
                is_bundle: true,
                bundle_items: [
                    { product_id: comp1.body.id, quantity: 2 },
                    { product_id: comp2.body.id, quantity: 1 },
                ],
            };

            const response = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send(bundlePayload);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.is_bundle).toBe(true);
            expect(response.body.stock).toBeNull();
            expect(response.body.bundle_items).toBeDefined();
            expect(response.body.bundle_items.length).toBe(2);
        });

        it('should return 400 when creating a bundle without bundle_items or with empty array', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const resNoItems = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Bundle Without Items',
                    slug: `no-items-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 50.0,
                    is_bundle: true,
                });

            expect(resNoItems.status).toBe(400);

            const resEmptyArray = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Bundle With Empty Array',
                    slug: `empty-items-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 50.0,
                    is_bundle: true,
                    bundle_items: [],
                });

            expect(resEmptyArray.status).toBe(400);
        });

        it('should return 400 when creating a bundle with a component belonging to another shop', async () => {
            const owner1 = await createAuthenticatedUser(client);
            const owner2 = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner1, 'Shop 1');
            const shop2 = await createShop(owner2, 'Shop 2');

            const foreignComp = await client
                .post(`/api/shops/${shop2.id}/products`)
                .set('Authorization', owner2.bearerHeader)
                .send({
                    name: 'Foreign Item',
                    slug: `foreign-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 30.0,
                    initial_quantity: 10,
                });

            const response = await client
                .post(`/api/shops/${shop1.id}/products`)
                .set('Authorization', owner1.bearerHeader)
                .send({
                    name: 'Cross Shop Bundle',
                    slug: `cross-shop-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 100.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: foreignComp.body.id, quantity: 1 },
                    ],
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('another shop');
        });

        it('should return 400 when creating a bundle with a component that is itself a bundle', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const simpleItem = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Simple Component',
                    slug: `simple-comp-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 10.0,
                    initial_quantity: 10,
                });

            const parentBundle = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Parent Bundle',
                    slug: `parent-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 25.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: simpleItem.body.id, quantity: 1 },
                    ],
                });

            expect(parentBundle.status).toBe(201);

            const nestedBundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Nested Bundle',
                    slug: `nested-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 50.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: parentBundle.body.id, quantity: 1 },
                    ],
                });

            expect(nestedBundleRes.status).toBe(400);
            expect(nestedBundleRes.body.message).toContain('bundle');
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

        it('should return 200 and bundle details including embedded bundle items with component details', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const comp1 = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Bundle Chair',
                    slug: `bundle-chair-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 25.0,
                    initial_quantity: 10,
                });

            const comp2 = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Bundle Table',
                    slug: `bundle-table-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 75.0,
                    initial_quantity: 5,
                });

            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Living Set Bundle',
                    slug: `living-set-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 150.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: comp1.body.id, quantity: 4 },
                        { product_id: comp2.body.id, quantity: 1 },
                    ],
                });

            expect(bundleRes.status).toBe(201);
            const bundleId = bundleRes.body.id;

            const response = await client
                .get(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(bundleId);
            expect(response.body.is_bundle).toBe(true);
            expect(response.body.stock).toBeNull();
            const items =
                response.body.bundle_items ?? response.body.bundleItems;
            expect(items).toBeDefined();
            expect(items.length).toBe(2);

            const chairItem = items.find(
                (i: any) => (i.product_id ?? i.productId) === comp1.body.id,
            );
            expect(chairItem).toBeDefined();
            expect(chairItem.quantity).toBe(4);
            const chairProduct =
                chairItem.componentProduct ?? chairItem.product;
            expect(chairProduct).toBeDefined();
            expect(chairProduct.name).toBe('Bundle Chair');

            const tableItem = items.find(
                (i: any) => (i.product_id ?? i.productId) === comp2.body.id,
            );
            expect(tableItem).toBeDefined();
            expect(tableItem.quantity).toBe(1);
            const tableProduct =
                tableItem.componentProduct ?? tableItem.product;
            expect(tableProduct).toBeDefined();
            expect(tableProduct.name).toBe('Bundle Table');
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

        it('should return 409 when deleting a simple product that is in an active bundle', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const simpleItem = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Essential Part',
                    slug: `essential-part-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                    initial_quantity: 5,
                });

            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Active Bundle',
                    slug: `active-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 50.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: simpleItem.body.id, quantity: 1 },
                    ],
                });

            expect(bundleRes.status).toBe(201);

            const deleteSimpleRes = await client
                .delete(`/api/shops/${shop.id}/products/${simpleItem.body.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteSimpleRes.status).toBe(409);
            expect(deleteSimpleRes.body.message).toContain('active bundle');
        });

        it('should return 200 and successfully delete a bundle, cascading deletion to bundle_items while component simple products remain', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const simpleItem = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Component To Retain',
                    slug: `retain-item-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                    initial_quantity: 5,
                });

            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Ephemeral Bundle',
                    slug: `ephemeral-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 50.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: simpleItem.body.id, quantity: 1 },
                    ],
                });

            expect(bundleRes.status).toBe(201);
            const bundleId = bundleRes.body.id;

            // Delete the bundle
            const deleteBundleRes = await client
                .delete(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);

            expect(deleteBundleRes.status).toBe(200);

            // Bundle is gone
            const getBundleRes = await client
                .get(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);
            expect(getBundleRes.status).toBe(404);

            // Component product still exists
            const getSimpleRes = await client
                .get(`/api/shops/${shop.id}/products/${simpleItem.body.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(getSimpleRes.status).toBe(200);

            // Now the component product can also be deleted
            const deleteSimpleRes = await client
                .delete(`/api/shops/${shop.id}/products/${simpleItem.body.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(deleteSimpleRes.status).toBe(200);
        });
    });

    describe('Dynamic Available Stock Evaluation (#117)', () => {
        it('should calculate dynamic available stock for a bundle with multiple components based on bottleneck component', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Component A: 10 stock
            const compA = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Component A',
                    slug: `comp-a-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 10.0,
                    initial_quantity: 10,
                });

            // Component B: 12 stock
            const compB = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Component B',
                    slug: `comp-b-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 15.0,
                    initial_quantity: 12,
                });

            // Bundle requires 2 of A (10/2 = 5) and 3 of B (12/3 = 4) -> bottleneck is 4
            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Combo Bundle',
                    slug: `combo-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 59.99,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: compA.body.id, quantity: 2 },
                        { product_id: compB.body.id, quantity: 3 },
                    ],
                });

            expect(bundleRes.status).toBe(201);
            const bundleId = bundleRes.body.id;

            // 1. Check Bundle Details GET /api/shops/:shopId/products/:id
            const detailRes = await client
                .get(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);

            expect(detailRes.status).toBe(200);
            expect(detailRes.body.available_stock).toBe(4);
            expect(detailRes.body.stock).toBeNull();

            const items =
                detailRes.body.bundle_items ?? detailRes.body.bundleItems;
            expect(items).toBeDefined();
            expect(items.length).toBe(2);

            const itemA = items.find(
                (i: any) => (i.product_id ?? i.productId) === compA.body.id,
            );
            expect(itemA).toBeDefined();
            expect(itemA.quantity).toBe(2);
            const stockA = itemA.stock ?? itemA.componentProduct?.stock;
            expect(stockA).toBeDefined();
            expect(stockA.quantity).toBe(10);
            expect(stockA.reserved).toBe(0);
            expect(stockA.available_stock).toBe(10);

            const itemB = items.find(
                (i: any) => (i.product_id ?? i.productId) === compB.body.id,
            );
            expect(itemB).toBeDefined();
            expect(itemB.quantity).toBe(3);
            const stockB = itemB.stock ?? itemB.componentProduct?.stock;
            expect(stockB).toBeDefined();
            expect(stockB.quantity).toBe(12);
            expect(stockB.reserved).toBe(0);
            expect(stockB.available_stock).toBe(12);

            // 2. Check Catalog Listing GET /api/shops/:shopId/products
            const listRes = await client
                .get(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader);

            expect(listRes.status).toBe(200);
            const listedBundle = listRes.body.find(
                (p: any) => p.id === bundleId,
            );
            expect(listedBundle).toBeDefined();
            expect(listedBundle.available_stock).toBe(4);

            const listedA = listRes.body.find(
                (p: any) => p.id === compA.body.id,
            );
            expect(listedA).toBeDefined();
            expect(listedA.available_stock).toBe(10);

            const listedB = listRes.body.find(
                (p: any) => p.id === compB.body.id,
            );
            expect(listedB).toBeDefined();
            expect(listedB.available_stock).toBe(12);
        });

        it('should immediately update dynamic available stock across multiple bundles sharing a component when that component stock changes', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Shared Component: Chair (20 in stock)
            const chairRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Shared Chair',
                    slug: `shared-chair-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                    initial_quantity: 20,
                });

            // Component: Table (10 in stock)
            const tableRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Table',
                    slug: `table-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 80.0,
                    initial_quantity: 10,
                });

            // Component: Arch (5 in stock)
            const archRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Arch',
                    slug: `arch-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 150.0,
                    initial_quantity: 5,
                });

            // Bundle 1 (Dinner Set): requires 4 Chairs, 1 Table
            // Chair: 20/4 = 5. Table: 10/1 = 10 -> Bundle 1 = 5
            const bundle1Res = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Dinner Set Bundle',
                    slug: `dinner-set-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 140.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: chairRes.body.id, quantity: 4 },
                        { product_id: tableRes.body.id, quantity: 1 },
                    ],
                });

            // Bundle 2 (Ceremony Set): requires 2 Chairs, 1 Arch
            // Chair: 20/2 = 10. Arch: 5/1 = 5 -> Bundle 2 = 5
            const bundle2Res = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Ceremony Set Bundle',
                    slug: `ceremony-set-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 180.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: chairRes.body.id, quantity: 2 },
                        { product_id: archRes.body.id, quantity: 1 },
                    ],
                });

            const bundle1Id = bundle1Res.body.id;
            const bundle2Id = bundle2Res.body.id;

            // Verify initial stock evaluation
            const initialB1 = await client
                .get(`/api/shops/${shop.id}/products/${bundle1Id}`)
                .set('Authorization', owner.bearerHeader);
            expect(initialB1.body.available_stock).toBe(5);

            const initialB2 = await client
                .get(`/api/shops/${shop.id}/products/${bundle2Id}`)
                .set('Authorization', owner.bearerHeader);
            expect(initialB2.body.available_stock).toBe(5);

            // Now, reduce Chair stock to 8 (e.g. sales or reservation)
            await db
                .update(stock)
                .set({ quantity: 8 })
                .where(eq(stock.product_id, chairRes.body.id));

            // With Chair stock = 8:
            // Bundle 1: Chair 8/4 = 2, Table 10/1 = 10 -> min is 2
            // Bundle 2: Chair 8/2 = 4, Arch 5/1 = 5 -> min is 4
            const updatedB1 = await client
                .get(`/api/shops/${shop.id}/products/${bundle1Id}`)
                .set('Authorization', owner.bearerHeader);
            expect(updatedB1.body.available_stock).toBe(2);

            const updatedB2 = await client
                .get(`/api/shops/${shop.id}/products/${bundle2Id}`)
                .set('Authorization', owner.bearerHeader);
            expect(updatedB2.body.available_stock).toBe(4);

            // Catalog listing also reflects updated available stock
            const listRes = await client
                .get(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader);

            const b1InList = listRes.body.find((p: any) => p.id === bundle1Id);
            expect(b1InList.available_stock).toBe(2);

            const b2InList = listRes.body.find((p: any) => p.id === bundle2Id);
            expect(b2InList.available_stock).toBe(4);

            const chairInList = listRes.body.find(
                (p: any) => p.id === chairRes.body.id,
            );
            expect(chairInList.available_stock).toBe(8);
        });

        it('should evaluate bundle available stock as 0 when any component has zero available stock', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const compAvailable = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Available Part',
                    slug: `avail-part-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 20.0,
                    initial_quantity: 10,
                });

            const compZero = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Zero Part',
                    slug: `zero-part-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 30.0,
                    initial_quantity: 0,
                });

            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Zero Stock Bundle',
                    slug: `zero-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 45.0,
                    is_bundle: true,
                    bundle_items: [
                        { product_id: compAvailable.body.id, quantity: 1 },
                        { product_id: compZero.body.id, quantity: 1 },
                    ],
                });

            const bundleId = bundleRes.body.id;

            // Details should show available_stock = 0
            const detailRes = await client
                .get(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);

            expect(detailRes.body.available_stock).toBe(0);

            // Listing should show available_stock = 0
            const listRes = await client
                .get(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader);

            const listedBundle = listRes.body.find(
                (p: any) => p.id === bundleId,
            );
            expect(listedBundle.available_stock).toBe(0);

            // When component has stock but all reserved (quantity 5, reserved 5 -> available 0)
            await db
                .update(stock)
                .set({ quantity: 5, reserved: 5 })
                .where(eq(stock.product_id, compZero.body.id));

            const detailAfterReserved = await client
                .get(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);
            expect(detailAfterReserved.body.available_stock).toBe(0);
        });

        it('should round down fractional bottleneck results to the nearest integer', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const comp = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Fractional Part',
                    slug: `frac-part-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 15.0,
                    initial_quantity: 5,
                });

            // Requires 2 -> floor(5 / 2) = 2
            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Fractional Bundle',
                    slug: `frac-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 25.0,
                    is_bundle: true,
                    bundle_items: [{ product_id: comp.body.id, quantity: 2 }],
                });

            const bundleId = bundleRes.body.id;

            const detailRes = await client
                .get(`/api/shops/${shop.id}/products/${bundleId}`)
                .set('Authorization', owner.bearerHeader);

            expect(detailRes.body.available_stock).toBe(2);

            const listRes = await client
                .get(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader);

            const listedBundle = listRes.body.find(
                (p: any) => p.id === bundleId,
            );
            expect(listedBundle.available_stock).toBe(2);
        });
    });
});

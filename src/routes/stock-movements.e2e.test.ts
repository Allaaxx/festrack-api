import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { faker } from '@faker-js/faker';

describe('Stock Movement Ledger and Manual Adjustments E2E Tests (#118)', () => {
    const client = testClient(app);

    const createShop = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Inventory Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', owner.bearerHeader)
            .send({ name, description: 'Shop for stock movement testing' });
        return response.body;
    };

    const createSimpleProduct = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        shopId: string,
        type: 'sale' | 'rent' | 'service' = 'sale',
        initialQuantity = 20,
    ) => {
        const payload: any = {
            name: `Product ${faker.commerce.productName()}`,
            slug: `product-${faker.string.alphanumeric(8)}`,
            type,
            price: 50.0,
            description: 'Item for stock testing',
        };
        if (type !== 'service') {
            payload.initial_quantity = initialQuantity;
        }

        const response = await client
            .post(`/api/shops/${shopId}/products`)
            .set('Authorization', owner.bearerHeader)
            .send(payload);

        return response.body;
    };

    describe('POST /api/shops/:shopId/products/:productId/stock/adjust', () => {
        it('should record INBOUND movement, update stock.quantity, and create movement row -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                10,
            );

            const adjustResponse = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'INBOUND',
                    quantityDelta: 15,
                    notes: 'Received shipment from supplier',
                });

            expect(adjustResponse.status).toBe(200);
            expect(adjustResponse.body.stock).toBeDefined();
            expect(adjustResponse.body.stock.quantity).toBe(25);
            expect(adjustResponse.body.movement).toBeDefined();
            expect(adjustResponse.body.movement.type).toBe('INBOUND');
            expect(adjustResponse.body.movement.quantity).toBe(15);
            expect(adjustResponse.body.movement.notes).toBe(
                'Received shipment from supplier',
            );

            // Verify product endpoint also reflects updated stock
            const getProductRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(getProductRes.body.stock.quantity).toBe(25);
        });

        it('should record positive ADJUSTMENT and update stock quantity -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                10,
            );

            const adjustResponse = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 5,
                    notes: 'Found extra inventory during annual audit',
                });

            expect(adjustResponse.status).toBe(200);
            expect(adjustResponse.body.stock.quantity).toBe(15);
            expect(adjustResponse.body.movement.type).toBe('ADJUSTMENT');
            expect(adjustResponse.body.movement.quantity).toBe(5);
        });

        it('should record negative ADJUSTMENT and update stock quantity -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                20,
            );

            const adjustResponse = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: -4,
                    notes: 'Inventory discrepancy reconciliation',
                });

            expect(adjustResponse.status).toBe(200);
            expect(adjustResponse.body.stock.quantity).toBe(16);
            expect(adjustResponse.body.movement.type).toBe('ADJUSTMENT');
            expect(adjustResponse.body.movement.quantity).toBe(4);
        });

        it('should record LOSS and decrement stock.quantity -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'rent',
                12,
            );

            const adjustResponse = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'LOSS',
                    quantityDelta: 3,
                    notes: 'Damaged during wedding event setup',
                });

            expect(adjustResponse.status).toBe(200);
            expect(adjustResponse.body.stock.quantity).toBe(9);
            expect(adjustResponse.body.movement.type).toBe('LOSS');
            expect(adjustResponse.body.movement.quantity).toBe(3);
        });

        it('should reject adjustment with missing or empty notes -> 400', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                10,
            );

            const res1 = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 2,
                });
            expect(res1.status).toBe(400);

            const res2 = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 2,
                    notes: '   ',
                });
            expect(res2.status).toBe(400);
        });

        it('should reject adjustment resulting in negative stock -> 400', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                5,
            );

            const response = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: -6,
                    notes: 'Trying to remove more than available',
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('negative');
        });

        it('should reject adjusting bundle or service product -> 400', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // 1. Service product
            const serviceProduct = await createSimpleProduct(
                owner,
                shop.id,
                'service',
            );
            const resService = await client
                .post(
                    `/api/shops/${shop.id}/products/${serviceProduct.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 5,
                    notes: 'Adjust service stock',
                });
            expect(resService.status).toBe(400);

            // 2. Bundle product
            const comp = await createSimpleProduct(owner, shop.id, 'sale', 20);
            const bundleRes = await client
                .post(`/api/shops/${shop.id}/products`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    name: 'Party Bundle',
                    slug: `party-bundle-${faker.string.alphanumeric(8)}`,
                    type: 'sale',
                    price: 99.0,
                    is_bundle: true,
                    bundle_items: [{ product_id: comp.id, quantity: 2 }],
                });
            expect(bundleRes.status).toBe(201);

            const resBundle = await client
                .post(
                    `/api/shops/${shop.id}/products/${bundleRes.body.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 5,
                    notes: 'Adjust bundle stock',
                });
            expect(resBundle.status).toBe(400);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                10,
            );

            const response = await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', outsider.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 1,
                    notes: 'Unauthorized adjustment',
                });

            expect(response.status).toBe(403);
        });

        it('should return 404 when product belongs to another shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner, 'Shop 1');
            const shop2 = await createShop(owner, 'Shop 2');
            const productShop1 = await createSimpleProduct(
                owner,
                shop1.id,
                'sale',
                10,
            );

            const response = await client
                .post(
                    `/api/shops/${shop2.id}/products/${productShop1.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'ADJUSTMENT',
                    quantityDelta: 1,
                    notes: 'Cross-shop adjustment',
                });

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/shops/:shopId/products/:productId/stock/movements', () => {
        it('should list stock movements in chronological order with user attribution -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                0,
            );

            // Record two adjustments
            await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'INBOUND',
                    quantityDelta: 10,
                    notes: 'Inbound delivery',
                });

            await client
                .post(
                    `/api/shops/${shop.id}/products/${product.id}/stock/adjust`,
                )
                .set('Authorization', owner.bearerHeader)
                .send({
                    type: 'LOSS',
                    quantityDelta: 2,
                    notes: 'Broken items',
                });

            const listResponse = await client
                .get(
                    `/api/shops/${shop.id}/products/${product.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(listResponse.status).toBe(200);
            expect(Array.isArray(listResponse.body)).toBe(true);
            expect(listResponse.body).toHaveLength(2);

            expect(listResponse.body[0].type).toBe('INBOUND');
            expect(listResponse.body[0].quantity).toBe(10);
            expect(listResponse.body[0].notes).toBe('Inbound delivery');
            expect(listResponse.body[0].createdByUser).toBeDefined();
            expect(listResponse.body[0].createdByUser.id).toBe(owner.user.id);
            expect(listResponse.body[0].createdByUser.email).toBe(
                owner.user.email,
            );

            expect(listResponse.body[1].type).toBe('LOSS');
            expect(listResponse.body[1].quantity).toBe(2);
            expect(listResponse.body[1].notes).toBe('Broken items');
            expect(listResponse.body[1].createdByUser.id).toBe(owner.user.id);
        });

        it('should return 404 when product has no stock record (e.g. service)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const serviceProduct = await createSimpleProduct(
                owner,
                shop.id,
                'service',
            );

            const response = await client
                .get(
                    `/api/shops/${shop.id}/products/${serviceProduct.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(response.status).toBe(404);
        });

        it('should return 403 when user is not member of shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'sale',
                10,
            );

            const response = await client
                .get(
                    `/api/shops/${shop.id}/products/${product.id}/stock/movements`,
                )
                .set('Authorization', outsider.bearerHeader);

            expect(response.status).toBe(403);
        });
    });
});

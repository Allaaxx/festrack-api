import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { faker } from '@faker-js/faker';

describe('Atomic Concurrency-Safe Stock Reservation E2E Tests (#119)', () => {
    const client = testClient(app);

    const createShop = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Reservation Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', owner.bearerHeader)
            .send({ name, description: 'Shop for reservation testing' });
        return response.body;
    };

    const createSimpleProduct = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        shopId: string,
        name = 'Chair',
        type: 'sale' | 'rent' | 'service' = 'sale',
        initialQuantity = 20,
    ) => {
        const payload: any = {
            name: `${name} ${faker.string.alphanumeric(6)}`,
            slug: `${name.toLowerCase()}-${faker.string.alphanumeric(8)}`,
            type,
            price: 50.0,
            description: 'Item for stock reservation',
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

    const createBundleProduct = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        shopId: string,
        bundleItems: Array<{ product_id: string; quantity: number }>,
        name = 'Party Kit',
        type: 'sale' | 'rent' = 'sale',
    ) => {
        const payload = {
            name: `${name} ${faker.string.alphanumeric(6)}`,
            slug: `${name.toLowerCase()}-${faker.string.alphanumeric(8)}`,
            type,
            price: 150.0,
            description: 'Bundle item for reservation',
            is_bundle: true,
            bundle_items: bundleItems,
        };

        const response = await client
            .post(`/api/shops/${shopId}/products`)
            .set('Authorization', owner.bearerHeader)
            .send(payload);

        return response.body;
    };

    describe('POST /api/shops/:shopId/stock/reserve', () => {
        it('should successfully reserve stock for a simple product -> 200 (updates stock.reserved, creates movement)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Vintage Chair',
                'sale',
                10,
            );

            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    referenceId: 'order-101',
                    notes: 'Order checkout reservation',
                    items: [
                        {
                            product_id: product.id,
                            quantity: 3,
                            type: 'sale',
                        },
                    ],
                });

            expect([200, 201]).toContain(reserveResponse.status);
            expect(reserveResponse.body.success).toBe(true);
            expect(reserveResponse.body.items).toBeDefined();
            expect(reserveResponse.body.items.length).toBe(1);
            expect(reserveResponse.body.items[0].product_id).toBe(product.id);
            expect(reserveResponse.body.items[0].quantity).toBe(3);
            expect(reserveResponse.body.items[0].reservedQuantity).toBe(3);
            expect(reserveResponse.body.movementIds.length).toBe(1);

            // Verify product stock reflects updated reserved count and available stock
            const productRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(productRes.body.stock.quantity).toBe(10);
            expect(productRes.body.stock.reserved).toBe(3);
            expect(productRes.body.available_stock).toBe(7);

            // Verify stock movement ledger recorded SALE movement
            const movementsRes = await client
                .get(
                    `/api/shops/${shop.id}/products/${product.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);

            expect(movementsRes.status).toBe(200);
            const reserveMovement = movementsRes.body.find(
                (m: any) =>
                    m.referenceId === 'order-101' ||
                    m.reference_id === 'order-101',
            );
            expect(reserveMovement).toBeDefined();
            expect(reserveMovement.type).toBe('SALE');
            expect(reserveMovement.quantity).toBe(3);
            expect(reserveMovement.notes).toBe('Order checkout reservation');
            expect(reserveMovement.createdByUserId).toBe(owner.user.id);
        });

        it('should successfully reserve stock for a bundle product -> 200 (updates stock.reserved for all components according to multiplier, creates movements)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Create components: 1 table (qty: 10), 4 chairs (qty: 30)
            const table = await createSimpleProduct(
                owner,
                shop.id,
                'Table',
                'rent',
                10,
            );
            const chair = await createSimpleProduct(
                owner,
                shop.id,
                'Chair',
                'rent',
                30,
            );

            // Create bundle: 1 table + 4 chairs per bundle
            const bundle = await createBundleProduct(
                owner,
                shop.id,
                [
                    { product_id: table.id, quantity: 1 },
                    { product_id: chair.id, quantity: 4 },
                ],
                'Dining Set',
                'rent',
            );

            // Reserve 2 bundles: requires 2 tables and 8 chairs
            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    referenceId: 'rental-202',
                    notes: 'Event rental reservation',
                    items: [
                        {
                            product_id: bundle.id,
                            quantity: 2,
                            type: 'rent',
                        },
                    ],
                });

            expect([200, 201]).toContain(reserveResponse.status);
            expect(reserveResponse.body.success).toBe(true);
            expect(reserveResponse.body.items.length).toBe(2);

            // Check Table stock: reserved + 2
            const tableRes = await client
                .get(`/api/shops/${shop.id}/products/${table.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(tableRes.body.stock.reserved).toBe(2);
            expect(tableRes.body.available_stock).toBe(8);

            // Check Chair stock: reserved + 8
            const chairRes = await client
                .get(`/api/shops/${shop.id}/products/${chair.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(chairRes.body.stock.reserved).toBe(8);
            expect(chairRes.body.available_stock).toBe(22);

            // Check bundle dynamic stock: min(floor(8/1), floor(22/4)) = min(8, 5) = 5
            const bundleRes = await client
                .get(`/api/shops/${shop.id}/products/${bundle.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(bundleRes.body.available_stock).toBe(5);

            // Verify movements were created with RENTAL_ALLOCATION
            const tableMovements = await client
                .get(
                    `/api/shops/${shop.id}/products/${table.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);
            const tableAlloc = tableMovements.body.find(
                (m: any) => m.referenceId === 'rental-202',
            );
            expect(tableAlloc).toBeDefined();
            expect(tableAlloc.type).toBe('RENTAL_ALLOCATION');
            expect(tableAlloc.quantity).toBe(2);

            const chairMovements = await client
                .get(
                    `/api/shops/${shop.id}/products/${chair.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);
            const chairAlloc = chairMovements.body.find(
                (m: any) => m.referenceId === 'rental-202',
            );
            expect(chairAlloc).toBeDefined();
            expect(chairAlloc.type).toBe('RENTAL_ALLOCATION');
            expect(chairAlloc.quantity).toBe(8);
        });

        it('should successfully reserve multiple items sharing the same component and aggregate required quantity correctly', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Component: Wine Glass (qty: 50)
            const glass = await createSimpleProduct(
                owner,
                shop.id,
                'Wine Glass',
                'sale',
                50,
            );

            // Bundle: Dinner Set (requires 2 Wine Glasses)
            const dinnerBundle = await createBundleProduct(
                owner,
                shop.id,
                [{ product_id: glass.id, quantity: 2 }],
                'Dinner Set',
                'sale',
            );

            // Cart with:
            // - 5 individual Wine Glasses
            // - 3 Dinner Sets (3 * 2 = 6 glasses)
            // Total required glasses = 5 + 6 = 11 glasses!
            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    referenceId: 'order-shared-component',
                    items: [
                        { product_id: glass.id, quantity: 5 },
                        { product_id: dinnerBundle.id, quantity: 3 },
                    ],
                });

            expect([200, 201]).toContain(reserveResponse.status);
            expect(reserveResponse.body.success).toBe(true);

            // Total glasses reserved should be exactly 11
            const glassRes = await client
                .get(`/api/shops/${shop.id}/products/${glass.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(glassRes.body.stock.reserved).toBe(11);
            expect(glassRes.body.available_stock).toBe(39);
        });

        it('should reject reservation atomically when available stock is insufficient -> 409 (zero changes persisted)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Component 1 has plenty (qty: 50)
            const compPlenty = await createSimpleProduct(
                owner,
                shop.id,
                'Abundant Item',
                'sale',
                50,
            );
            // Component 2 is scarce (qty: 2)
            const compScarce = await createSimpleProduct(
                owner,
                shop.id,
                'Scarce Item',
                'sale',
                2,
            );

            // Request 5 of Plenty AND 5 of Scarce in one reservation
            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    referenceId: 'order-failed',
                    items: [
                        { product_id: compPlenty.id, quantity: 5 },
                        { product_id: compScarce.id, quantity: 5 }, // Scarce only has 2!
                    ],
                });

            expect(reserveResponse.status).toBe(409);
            expect(reserveResponse.body.message).toBeDefined();
            expect(reserveResponse.body.details).toBeDefined();
            expect(reserveResponse.body.details.length).toBeGreaterThanOrEqual(
                1,
            );

            const scarceDetail = reserveResponse.body.details.find(
                (d: any) =>
                    d.productId === compScarce.id ||
                    d.product_id === compScarce.id,
            );
            expect(scarceDetail).toBeDefined();
            expect(scarceDetail.requestedQuantity).toBe(5);
            expect(scarceDetail.availableStock).toBe(2);

            // ATOMICITY CHECK: Verify ZERO changes were made to Plenty Item!
            const plentyRes = await client
                .get(`/api/shops/${shop.id}/products/${compPlenty.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(plentyRes.body.stock.reserved).toBe(0);
            expect(plentyRes.body.available_stock).toBe(50);

            // Scarce item should also remain completely untouched
            const scarceRes = await client
                .get(`/api/shops/${shop.id}/products/${compScarce.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(scarceRes.body.stock.reserved).toBe(0);
            expect(scarceRes.body.available_stock).toBe(2);

            // Ensure no stock movements were recorded for this failed reference
            const plentyMovements = await client
                .get(
                    `/api/shops/${shop.id}/products/${compPlenty.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);
            const failedMovements = plentyMovements.body.filter(
                (m: any) => m.referenceId === 'order-failed',
            );
            expect(failedMovements.length).toBe(0);
        });

        it('should skip physical stock when reserving service products alongside physical products', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const chair = await createSimpleProduct(
                owner,
                shop.id,
                'Chair',
                'sale',
                10,
            );
            const djService = await createSimpleProduct(
                owner,
                shop.id,
                'DJ Service',
                'service',
            );

            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        { product_id: chair.id, quantity: 2 },
                        { product_id: djService.id, quantity: 1 },
                    ],
                });

            expect([200, 201]).toContain(reserveResponse.status);
            expect(reserveResponse.body.items.length).toBe(1);
            expect(reserveResponse.body.items[0].product_id).toBe(chair.id);

            const chairRes = await client
                .get(`/api/shops/${shop.id}/products/${chair.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(chairRes.body.stock.reserved).toBe(2);
        });

        it('should return 403 when user is not a member of the shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const stranger = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Chair',
                'sale',
                10,
            );

            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', stranger.bearerHeader)
                .send({
                    items: [{ product_id: product.id, quantity: 1 }],
                });

            expect(reserveResponse.status).toBe(403);
        });

        it('should return 404 when product belongs to another shop', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop1 = await createShop(owner, 'Shop 1');
            const shop2 = await createShop(owner, 'Shop 2');
            const foreignProduct = await createSimpleProduct(
                owner,
                shop2.id,
                'Shop 2 Product',
                'sale',
                10,
            );

            const reserveResponse = await client
                .post(`/api/shops/${shop1.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [{ product_id: foreignProduct.id, quantity: 1 }],
                });

            expect(reserveResponse.status).toBe(404);
        });

        it('should return 400 when reservation item quantity is invalid (< 1)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Chair',
                'sale',
                10,
            );

            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [{ product_id: product.id, quantity: 0 }],
                });

            expect(reserveResponse.status).toBe(400);
        });

        it('should work via mounted alias route /api/shops/:shopId/products/stock/reserve as well', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Chair',
                'sale',
                10,
            );

            const reserveResponse = await client
                .post(`/api/shops/${shop.id}/products/stock/reserve`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [{ product_id: product.id, quantity: 2 }],
                });

            expect([200, 201]).toContain(reserveResponse.status);
            expect(reserveResponse.body.items[0].reservedQuantity).toBe(2);
        });

        it('High-concurrency test: fire 5 simultaneous reservation requests competing for limited stock of 2 units -> exactly 2 succeed and 3 receive 409 InsufficientStockError without over-selling or deadlock', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            // Limited stock of exactly 2 units
            const limitedProduct = await createSimpleProduct(
                owner,
                shop.id,
                'Rare Antique Lamp',
                'sale',
                2,
            );

            // Fire 5 simultaneous reservation requests, each demanding 1 unit
            const requests = Array.from({ length: 5 }, (_, idx) =>
                client
                    .post(`/api/shops/${shop.id}/stock/reserve`)
                    .set('Authorization', owner.bearerHeader)
                    .send({
                        referenceId: `concurrent-order-${idx + 1}`,
                        items: [{ product_id: limitedProduct.id, quantity: 1 }],
                    }),
            );

            const responses = await Promise.all(requests);

            const successful = responses.filter(
                (r) => r.status === 200 || r.status === 201,
            );
            const insufficient = responses.filter((r) => r.status === 409);

            // Exactly 2 must succeed!
            expect(successful.length).toBe(2);

            // Exactly 3 must be rejected with 409!
            expect(insufficient.length).toBe(3);

            for (const rej of insufficient) {
                expect(rej.body.details).toBeDefined();
                expect(rej.body.message).toContain(limitedProduct.id);
            }

            // Verify the database state: reserved must be EXACTLY 2 (never over-sold to 3, 4, or 5)
            const finalProductRes = await client
                .get(`/api/shops/${shop.id}/products/${limitedProduct.id}`)
                .set('Authorization', owner.bearerHeader);

            expect(finalProductRes.body.stock.quantity).toBe(2);
            expect(finalProductRes.body.stock.reserved).toBe(2);
            expect(finalProductRes.body.available_stock).toBe(0);

            // Verify stock movements: exactly 2 SALE movements must exist
            const movementsRes = await client
                .get(
                    `/api/shops/${shop.id}/products/${limitedProduct.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);

            const saleMovements = movementsRes.body.filter(
                (m: any) => m.type === 'SALE',
            );
            expect(saleMovements.length).toBe(2);
        });
    });
});

import { describe, it, expect } from 'bun:test';
import { app } from '../app.js';
import { testClient } from '../test-helper.js';
import { createAuthenticatedUser } from '../tests/auth-helper.js';
import { faker } from '@faker-js/faker';

describe('Component-Level Rental Return Check-in and Loss Reporting E2E Tests (#120)', () => {
    const client = testClient(app);

    const createShop = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        name = 'Checkin Rental Shop',
    ) => {
        const response = await client
            .post('/api/shops')
            .set('Authorization', owner.bearerHeader)
            .send({ name, description: 'Shop for rental check-in testing' });
        return response.body;
    };

    const createSimpleProduct = async (
        owner: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        shopId: string,
        name = 'Rental Chair',
        type: 'sale' | 'rent' | 'service' = 'rent',
        initialQuantity = 20,
    ) => {
        const payload: any = {
            name: `${name} ${faker.string.alphanumeric(6)}`,
            slug: `${name.toLowerCase()}-${faker.string.alphanumeric(8)}`,
            type,
            price: 45.0,
            description: 'Item for rental return check-in test',
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
        name = 'Party Lounge Set',
        type: 'sale' | 'rent' = 'rent',
    ) => {
        const payload = {
            name: `${name} ${faker.string.alphanumeric(6)}`,
            slug: `${name.toLowerCase()}-${faker.string.alphanumeric(8)}`,
            type,
            price: 180.0,
            description: 'Rental bundle kit for check-in test',
            is_bundle: true,
            bundle_items: bundleItems,
        };

        const response = await client
            .post(`/api/shops/${shopId}/products`)
            .set('Authorization', owner.bearerHeader)
            .send(payload);

        return response.body;
    };

    const reserveStock = async (
        user: Awaited<ReturnType<typeof createAuthenticatedUser>>,
        shopId: string,
        items: Array<{
            product_id: string;
            quantity: number;
            type?: 'rent' | 'sale';
        }>,
        referenceId?: string,
    ) => {
        const response = await client
            .post(`/api/shops/${shopId}/stock/reserve`)
            .set('Authorization', user.bearerHeader)
            .send({
                referenceId: referenceId ?? 'booking-ref-1',
                items,
            });
        return response;
    };

    describe('POST /api/shops/:shopId/stock/checkin', () => {
        it('should successfully check in undamaged rental items -> 200 (decrements reserved, records RENTAL_RETURN movement)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Vintage Throne',
                'rent',
                10,
            );

            // Reserve 4 units
            const reserveRes = await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 4, type: 'rent' },
            ]);
            expect(reserveRes.status).toBe(200);

            // Verify reserved stock before return
            const beforeProductRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(beforeProductRes.body.stock.quantity).toBe(10);
            expect(beforeProductRes.body.stock.reserved).toBe(4);
            expect(beforeProductRes.body.available_stock).toBe(6);

            // Check in all 4 units returned intact
            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    reference_id: 'booking-ref-1',
                    notes: 'Post-event check-in: all items in perfect shape',
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 4,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect(checkinRes.status).toBe(200);
            expect(checkinRes.body.success).toBe(true);
            expect(checkinRes.body.items).toBeDefined();
            expect(checkinRes.body.items.length).toBe(1);
            expect(checkinRes.body.items[0].product_id).toBe(product.id);
            expect(checkinRes.body.items[0].returned_quantity).toBe(4);
            expect(checkinRes.body.items[0].damaged_quantity).toBe(0);
            expect(checkinRes.body.items[0].current_quantity).toBe(10);
            expect(checkinRes.body.items[0].current_reserved).toBe(0);

            // Verify product stock reflects decremented reserved and restored available stock
            const afterProductRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(afterProductRes.body.stock.quantity).toBe(10);
            expect(afterProductRes.body.stock.reserved).toBe(0);
            expect(afterProductRes.body.available_stock).toBe(10);

            // Verify stock movement ledger recorded RENTAL_RETURN
            const movementsRes = await client
                .get(
                    `/api/shops/${shop.id}/products/${product.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);
            expect(movementsRes.status).toBe(200);
            const movements = Array.isArray(movementsRes.body)
                ? movementsRes.body
                : movementsRes.body.movements;
            const returnMovement = movements.find(
                (m: any) => m.type === 'RENTAL_RETURN',
            );
            expect(returnMovement).toBeDefined();
            expect(returnMovement.quantity).toBe(4);
            expect(
                returnMovement.referenceId ?? returnMovement.reference_id,
            ).toBe('booking-ref-1');
        });

        it('should successfully check in with damaged items -> 200 (decrements reserved and on-hand quantity, records LOSS movement with damage notes)', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Crystal Chandelier',
                'rent',
                10,
            );

            // Reserve 5 chandeliers
            await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 5, type: 'rent' },
            ]);

            // Check in: 3 intact, 2 damaged
            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    reference_id: 'booking-loss-1',
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 3,
                            damaged_quantity: 2,
                            notes: 'Shattered crystal pendants during transit',
                        },
                    ],
                });

            expect(checkinRes.status).toBe(200);
            expect(checkinRes.body.success).toBe(true);
            expect(checkinRes.body.items[0].product_id).toBe(product.id);
            expect(checkinRes.body.items[0].returned_quantity).toBe(3);
            expect(checkinRes.body.items[0].damaged_quantity).toBe(2);
            expect(checkinRes.body.items[0].current_quantity).toBe(8); // 10 - 2
            expect(checkinRes.body.items[0].current_reserved).toBe(0); // 5 - 5

            // Verify product stock in DB
            const afterProductRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(afterProductRes.body.stock.quantity).toBe(8);
            expect(afterProductRes.body.stock.reserved).toBe(0);
            expect(afterProductRes.body.available_stock).toBe(8);

            // Verify stock movement ledger has both RENTAL_RETURN and LOSS
            const movementsRes = await client
                .get(
                    `/api/shops/${shop.id}/products/${product.id}/stock/movements`,
                )
                .set('Authorization', owner.bearerHeader);
            expect(movementsRes.status).toBe(200);
            const movements = Array.isArray(movementsRes.body)
                ? movementsRes.body
                : movementsRes.body.movements;

            const returnMovement = movements.find(
                (m: any) => m.type === 'RENTAL_RETURN',
            );
            expect(returnMovement).toBeDefined();
            expect(returnMovement.quantity).toBe(3);

            const lossMovement = movements.find((m: any) => m.type === 'LOSS');
            expect(lossMovement).toBeDefined();
            expect(lossMovement.quantity).toBe(2);
            expect(lossMovement.notes).toBe(
                'Shattered crystal pendants during transit',
            );
        });

        it('should handle partial check-in (some items returned now, some remaining reserved) -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Folding Tent',
                'rent',
                10,
            );

            // Reserve 6 tents
            await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 6, type: 'rent' },
            ]);

            // First check-in: 2 tents returned intact
            const firstCheckin = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 2,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect(firstCheckin.status).toBe(200);
            expect(firstCheckin.body.items[0].current_reserved).toBe(4);
            expect(firstCheckin.body.items[0].current_quantity).toBe(10);

            // Check stock after first checkin
            let productRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(productRes.body.stock.quantity).toBe(10);
            expect(productRes.body.stock.reserved).toBe(4);
            expect(productRes.body.available_stock).toBe(6);

            // Second check-in: remaining 4 tents (3 intact, 1 damaged)
            const secondCheckin = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 3,
                            damaged_quantity: 1,
                            notes: 'Canopy ripped by wind',
                        },
                    ],
                });

            expect(secondCheckin.status).toBe(200);
            expect(secondCheckin.body.items[0].current_reserved).toBe(0);
            expect(secondCheckin.body.items[0].current_quantity).toBe(9);

            // Final stock
            productRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(productRes.body.stock.quantity).toBe(9);
            expect(productRes.body.stock.reserved).toBe(0);
            expect(productRes.body.available_stock).toBe(9);
        });

        it('should support checking in bundle products by resolving components -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const table = await createSimpleProduct(
                owner,
                shop.id,
                'Round Table',
                'rent',
                5,
            );
            const chair = await createSimpleProduct(
                owner,
                shop.id,
                'Banquet Chair',
                'rent',
                20,
            );

            // Bundle: 1 table + 4 chairs
            const combo = await createBundleProduct(
                owner,
                shop.id,
                [
                    { product_id: table.id, quantity: 1 },
                    { product_id: chair.id, quantity: 4 },
                ],
                'Table & 4 Chairs Set',
                'rent',
            );

            // Reserve 2 bundles (requires 2 tables, 8 chairs)
            await reserveStock(owner, shop.id, [
                { product_id: combo.id, quantity: 2, type: 'rent' },
            ]);

            const tableBefore = await client
                .get(`/api/shops/${shop.id}/products/${table.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(tableBefore.body.stock.reserved).toBe(2);

            const chairBefore = await client
                .get(`/api/shops/${shop.id}/products/${chair.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(chairBefore.body.stock.reserved).toBe(8);

            // Check in 2 bundles returned: all tables intact, but 1 chair was lost
            // Or check in directly at component level:
            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: table.id,
                            returned_quantity: 2,
                            damaged_quantity: 0,
                        },
                        {
                            product_id: chair.id,
                            returned_quantity: 7,
                            damaged_quantity: 1,
                            notes: '1 chair left behind at event venue',
                        },
                    ],
                });

            expect(checkinRes.status).toBe(200);

            // Table stock
            const tableAfter = await client
                .get(`/api/shops/${shop.id}/products/${table.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(tableAfter.body.stock.reserved).toBe(0);
            expect(tableAfter.body.stock.quantity).toBe(5);

            // Chair stock
            const chairAfter = await client
                .get(`/api/shops/${shop.id}/products/${chair.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(chairAfter.body.stock.reserved).toBe(0);
            expect(chairAfter.body.stock.quantity).toBe(19); // 20 - 1 lost
        });

        it('should support checking in with bundle product ID directly -> 200', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const speaker = await createSimpleProduct(
                owner,
                shop.id,
                'PA Speaker',
                'rent',
                4,
            );
            const mic = await createSimpleProduct(
                owner,
                shop.id,
                'Wireless Mic',
                'rent',
                8,
            );

            // Bundle: 2 speakers + 2 mics
            const soundBundle = await createBundleProduct(
                owner,
                shop.id,
                [
                    { product_id: speaker.id, quantity: 2 },
                    { product_id: mic.id, quantity: 2 },
                ],
                'Sound System Pack',
                'rent',
            );

            // Reserve 1 bundle (2 speakers, 2 mics)
            await reserveStock(owner, shop.id, [
                { product_id: soundBundle.id, quantity: 1, type: 'rent' },
            ]);

            // Check in 1 sound bundle returned intact
            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: soundBundle.id,
                            returned_quantity: 1,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect(checkinRes.status).toBe(200);

            const speakerAfter = await client
                .get(`/api/shops/${shop.id}/products/${speaker.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(speakerAfter.body.stock.reserved).toBe(0);

            const micAfter = await client
                .get(`/api/shops/${shop.id}/products/${mic.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(micAfter.body.stock.reserved).toBe(0);
        });

        it('should reject check-in when returned + damaged exceeds reserved quantity -> 400 or 409', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Smoke Machine',
                'rent',
                10,
            );

            // Reserve only 2 units
            await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 2, type: 'rent' },
            ]);

            // Attempt to check in 3 units (exceeds 2 reserved)
            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 3,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect([400, 409]).toContain(checkinRes.status);
            expect(checkinRes.body.message).toBeDefined();

            // Stock reserved must remain untouched at 2
            const productRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(productRes.body.stock.reserved).toBe(2);
            expect(productRes.body.stock.quantity).toBe(10);
        });

        it('should reject damaged items check-in with missing notes -> 400', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Spotlight',
                'rent',
                10,
            );

            // Reserve 2 units
            await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 2, type: 'rent' },
            ]);

            // Check in with damaged quantity > 0 but NO notes
            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 1,
                            damaged_quantity: 1,
                            // notes missing!
                        },
                    ],
                });

            expect(checkinRes.status).toBe(400);
            expect(checkinRes.body.message).toContain('notes');

            // Stock should be unchanged
            const productRes = await client
                .get(`/api/shops/${shop.id}/products/${product.id}`)
                .set('Authorization', owner.bearerHeader);
            expect(productRes.body.stock.reserved).toBe(2);
            expect(productRes.body.stock.quantity).toBe(10);
        });

        it('should reject unauthorized user (non-member) -> 403', async () => {
            const owner = await createAuthenticatedUser(client);
            const outsider = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Staging Platform',
                'rent',
                10,
            );

            await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 2, type: 'rent' },
            ]);

            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', outsider.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 2,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect(checkinRes.status).toBe(403);
        });

        it('should reject check-in for non-existent product -> 404', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);

            const checkinRes = await client
                .post(`/api/shops/${shop.id}/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: faker.string.uuid(),
                            returned_quantity: 1,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect(checkinRes.status).toBe(404);
        });

        it('should work via mounted alias route /api/shops/:shopId/products/stock/checkin as well', async () => {
            const owner = await createAuthenticatedUser(client);
            const shop = await createShop(owner);
            const product = await createSimpleProduct(
                owner,
                shop.id,
                'Archway Stand',
                'rent',
                10,
            );

            await reserveStock(owner, shop.id, [
                { product_id: product.id, quantity: 2, type: 'rent' },
            ]);

            const checkinRes = await client
                .post(`/api/shops/${shop.id}/products/stock/checkin`)
                .set('Authorization', owner.bearerHeader)
                .send({
                    items: [
                        {
                            product_id: product.id,
                            returned_quantity: 2,
                            damaged_quantity: 0,
                        },
                    ],
                });

            expect(checkinRes.status).toBe(200);
            expect(checkinRes.body.success).toBe(true);
        });
    });
});

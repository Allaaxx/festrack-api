import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import { usersTable, shops } from '../../../db/postgres/schemas/index.js';
import { user, shop } from '../../../tests/index.js';
import { PostgresProductRepository } from './product-repository.js';
import { PostgresStockRepository } from './stock-repository.js';
import { ProductNotFoundError } from '../../../errors/product.js';
import { faker } from '@faker-js/faker';

describe('Postgres Product & Stock Repositories', () => {
    let productRepo: PostgresProductRepository;
    let stockRepo: PostgresStockRepository;

    beforeEach(async () => {
        productRepo = new PostgresProductRepository();
        stockRepo = new PostgresStockRepository();

        await db.insert(usersTable).values(user);
        await db.insert(shops).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    describe('ProductRepository', () => {
        it('should create a product and find it by id and slug', async () => {
            const slug = `slug-${faker.string.alphanumeric(8)}`;
            const created = await productRepo.create({
                shop_id: shop.id,
                name: 'Decor Light',
                slug,
                type: 'rent',
                price: 25.5,
                description: 'Fairy lights',
                images: ['http://example.com/lights.jpg'],
            });

            expect(created.id).toBeDefined();
            expect(created.slug).toBe(slug);
            expect(created.shop_id).toBe(shop.id);
            expect(created.name).toBe('Decor Light');
            expect(Number(created.price)).toBe(25.5);

            const foundById = await productRepo.findById(created.id);
            expect(foundById).toEqual(created);

            const foundBySlug = await productRepo.findBySlug(slug);
            expect(foundBySlug).toEqual(created);
        });

        it('should find product with stock', async () => {
            const slug = `slug-${faker.string.alphanumeric(8)}`;
            const created = await productRepo.create({
                shop_id: shop.id,
                name: 'Sound System',
                slug,
                type: 'rent',
                price: 200,
            });

            await stockRepo.create({
                product_id: created.id,
                quantity: 3,
                reserved: 1,
            });

            const found = await productRepo.findByIdWithStock(created.id);
            expect(found).not.toBeNull();
            expect(found?.stock).toBeDefined();
            expect(found?.stock?.quantity).toBe(3);
            expect(found?.stock?.reserved).toBe(1);
        });

        it('should find products by shopId with type filter', async () => {
            const saleSlug = `sale-${faker.string.alphanumeric(8)}`;
            const serviceSlug = `srv-${faker.string.alphanumeric(8)}`;

            await productRepo.create({
                shop_id: shop.id,
                name: 'Sale Item',
                slug: saleSlug,
                type: 'sale',
                price: 10,
            });

            await productRepo.create({
                shop_id: shop.id,
                name: 'Service Item',
                slug: serviceSlug,
                type: 'service',
                price: 50,
            });

            const allProducts = await productRepo.findByShopId(shop.id);
            expect(allProducts.length).toBe(2);

            const saleOnly = await productRepo.findByShopId(shop.id, {
                type: 'sale',
            });
            expect(saleOnly.length).toBe(1);
            expect(saleOnly[0].type).toBe('sale');
        });

        it('should update and delete product', async () => {
            const slug = `slug-${faker.string.alphanumeric(8)}`;
            const created = await productRepo.create({
                shop_id: shop.id,
                name: 'Old Name',
                slug,
                type: 'sale',
                price: 10,
            });

            const updated = await productRepo.update(created.id, {
                name: 'New Name',
                price: 15,
            });
            expect(updated.name).toBe('New Name');
            expect(Number(updated.price)).toBe(15);

            const deleted = await productRepo.delete(created.id);
            expect(deleted.id).toBe(created.id);

            const afterDelete = await productRepo.findById(created.id);
            expect(afterDelete).toBeNull();
        });

        it('should throw ProductNotFoundError when deleting non-existent product', async () => {
            await expect(
                productRepo.delete(faker.string.uuid()),
            ).rejects.toThrow(ProductNotFoundError);
        });
    });

    describe('StockRepository', () => {
        it('should create, find, update and delete stock', async () => {
            const slug = `slug-${faker.string.alphanumeric(8)}`;
            const createdProduct = await productRepo.create({
                shop_id: shop.id,
                name: 'Candle',
                slug,
                type: 'sale',
                price: 5,
            });

            const createdStock = await stockRepo.create({
                product_id: createdProduct.id,
                quantity: 20,
                reserved: 0,
            });

            expect(createdStock.id).toBeDefined();
            expect(createdStock.product_id).toBe(createdProduct.id);
            expect(createdStock.quantity).toBe(20);

            const found = await stockRepo.findByProductId(createdProduct.id);
            expect(found?.quantity).toBe(20);

            const updated = await stockRepo.update(createdProduct.id, {
                quantity: 15,
                reserved: 5,
            });
            expect(updated.quantity).toBe(15);
            expect(updated.reserved).toBe(5);

            await stockRepo.delete(createdProduct.id);
            const afterDelete = await stockRepo.findByProductId(
                createdProduct.id,
            );
            expect(afterDelete).toBeNull();
        });

        it('should findManyByProductIdsWithLock inside transaction sorted by product_id', async () => {
            const p1 = await productRepo.create({
                shop_id: shop.id,
                name: 'Item B',
                slug: `item-b-${faker.string.alphanumeric(8)}`,
                type: 'sale',
                price: 10,
            });
            const p2 = await productRepo.create({
                shop_id: shop.id,
                name: 'Item A',
                slug: `item-a-${faker.string.alphanumeric(8)}`,
                type: 'sale',
                price: 20,
            });

            await stockRepo.create({
                product_id: p1.id,
                quantity: 10,
                reserved: 0,
            });
            await stockRepo.create({
                product_id: p2.id,
                quantity: 20,
                reserved: 2,
            });

            const results = await db.transaction(async (tx) => {
                // Pass product IDs in reverse order; should return sorted by product_id
                return await stockRepo.findManyByProductIdsWithLock(
                    [p1.id, p2.id],
                    tx,
                );
            });

            expect(results.length).toBe(2);
            // Verify sorted by product_id
            expect(
                results[0].product_id.localeCompare(results[1].product_id),
            ).toBeLessThan(0);
            const r1 = results.find((r) => r.product_id === p1.id);
            const r2 = results.find((r) => r.product_id === p2.id);
            expect(r1?.quantity).toBe(10);
            expect(r2?.quantity).toBe(20);
            expect(r2?.reserved).toBe(2);
            expect(r2?.availableStock).toBe(18);

            // Empty array returns empty
            const emptyResult = await stockRepo.findManyByProductIdsWithLock(
                [],
            );
            expect(emptyResult).toEqual([]);
        });
    });
});

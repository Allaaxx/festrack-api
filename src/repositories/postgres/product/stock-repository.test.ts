import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import { usersTable, shops } from '../../../db/postgres/schemas/index.js';
import { user, shop } from '../../../tests/index.js';
import { PostgresProductRepository } from './product-repository.js';
import { PostgresStockRepository } from './stock-repository.js';
import { DrizzleTransactionManager } from '../transaction-manager.js';
import { faker } from '@faker-js/faker';

describe('PostgresStockRepository', () => {
    let productRepo: PostgresProductRepository;
    let stockRepo: PostgresStockRepository;
    let transactionManager: DrizzleTransactionManager;

    beforeEach(async () => {
        productRepo = new PostgresProductRepository();
        stockRepo = new PostgresStockRepository();
        transactionManager = new DrizzleTransactionManager();

        await db.insert(usersTable).values(user);
        await db.insert(shops).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    it('should create, find, update and delete stock record', async () => {
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
        expect(createdStock.reserved).toBe(0);
        expect(createdStock.availableStock).toBe(20);

        const found = await stockRepo.findByProductId(createdProduct.id);
        expect(found?.quantity).toBe(20);
        expect(found?.reserved).toBe(0);

        const updated = await stockRepo.update(createdProduct.id, {
            quantity: 15,
            reserved: 5,
        });
        expect(updated.quantity).toBe(15);
        expect(updated.reserved).toBe(5);
        expect(updated.availableStock).toBe(10);

        await stockRepo.delete(createdProduct.id);
        const afterDelete = await stockRepo.findByProductId(createdProduct.id);
        expect(afterDelete).toBeNull();
    });

    it('should return null when finding non-existent stock', async () => {
        const nonExistent = await stockRepo.findByProductId(
            faker.string.uuid(),
        );
        expect(nonExistent).toBeNull();
    });

    it('should findManyByProductIdsWithLock sorted by product_id inside a transaction', async () => {
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

        const results = await transactionManager.run(async () => {
            return await stockRepo.findManyByProductIdsWithLock([p1.id, p2.id]);
        });

        expect(results.length).toBe(2);
        expect(
            results[0].product_id.localeCompare(results[1].product_id),
        ).toBeLessThan(0);

        const r1 = results.find((r) => r.product_id === p1.id);
        const r2 = results.find((r) => r.product_id === p2.id);
        expect(r1?.quantity).toBe(10);
        expect(r2?.quantity).toBe(20);
        expect(r2?.reserved).toBe(2);
        expect(r2?.availableStock).toBe(18);

        const emptyResult = await stockRepo.findManyByProductIdsWithLock([]);
        expect(emptyResult).toEqual([]);
    });
});

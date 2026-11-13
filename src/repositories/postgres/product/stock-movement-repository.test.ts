import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import { usersTable, shops } from '../../../db/postgres/schemas/index.js';
import { user, shop } from '../../../tests/index.js';
import { PostgresProductRepository } from './product-repository.js';
import { PostgresStockRepository } from './stock-repository.js';
import { PostgresStockMovementRepository } from './stock-movement-repository.js';
import { faker } from '@faker-js/faker';

describe('PostgresStockMovementRepository', () => {
    let productRepo: PostgresProductRepository;
    let stockRepo: PostgresStockRepository;
    let movementRepo: PostgresStockMovementRepository;

    beforeEach(async () => {
        productRepo = new PostgresProductRepository();
        stockRepo = new PostgresStockRepository();
        movementRepo = new PostgresStockMovementRepository();

        await db.insert(usersTable).values(user);
        await db.insert(shops).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    it('should create and retrieve stock movements ordered chronologically with user attribution', async () => {
        const product = await productRepo.create({
            shop_id: shop.id,
            name: 'Test Chair',
            slug: `chair-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 50,
        });

        const createdStock = await stockRepo.create({
            product_id: product.id,
            quantity: 10,
            reserved: 0,
        });

        const m1 = await movementRepo.create({
            stockId: createdStock.id,
            type: 'INBOUND',
            quantity: 10,
            notes: 'Initial stock intake',
            createdByUserId: user.id,
        });

        expect(m1.id).toBeDefined();
        expect(m1.stockId).toBe(createdStock.id);
        expect(m1.type).toBe('INBOUND');
        expect(m1.quantity).toBe(10);
        expect(m1.notes).toBe('Initial stock intake');

        const m2 = await movementRepo.create({
            stockId: createdStock.id,
            type: 'ADJUSTMENT',
            quantity: 5,
            notes: 'Manual inventory count correction',
            createdByUserId: user.id,
        });

        const movements = await movementRepo.findByStockId(createdStock.id);

        expect(movements).toHaveLength(2);
        expect(movements[0].id).toBe(m1.id);
        expect(movements[0].type).toBe('INBOUND');
        expect(movements[0].createdByUser?.id).toBe(user.id);
        expect(movements[0].createdByUser?.email).toBe(user.email);
        expect(movements[1].id).toBe(m2.id);
        expect(movements[1].type).toBe('ADJUSTMENT');
        expect(movements[1].createdByUser?.id).toBe(user.id);
    });
});

import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import { usersTable, shops } from '../../../db/postgres/schemas/index.js';
import { user, shop } from '../../../tests/index.js';
import { PostgresProductRepository } from './product-repository.js';
import { PostgresStockRepository } from './stock-repository.js';
import { ProductNotFoundError } from '../../../errors/product.js';
import { faker } from '@faker-js/faker';

describe('Postgres ProductRepository', () => {
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

    it('should create a product and find it by id and slug (scoped to shop)', async () => {
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
        expect(created.isActive).toBe(true);

        const foundById = await productRepo.findById(created.id);
        expect(foundById).toEqual(created);

        const foundBySlug = await productRepo.findBySlug(shop.id, slug);
        expect(foundBySlug).toEqual(created);

        const notFoundOtherShop = await productRepo.findBySlug(
            faker.string.uuid(),
            slug,
        );
        expect(notFoundOtherShop).toBeNull();
    });

    it('should allow identical slugs across different shops (tenant isolation)', async () => {
        const sharedSlug = `shared-slug-${faker.string.alphanumeric(8)}`;
        const shop2Id = faker.string.uuid();
        await db.insert(shops).values({
            id: shop2Id,
            name: 'Second Shop',
            description: 'Another shop',
        });

        const prod1 = await productRepo.create({
            shop_id: shop.id,
            name: 'Product Shop 1',
            slug: sharedSlug,
            type: 'sale',
            price: 10,
        });

        const prod2 = await productRepo.create({
            shop_id: shop2Id,
            name: 'Product Shop 2',
            slug: sharedSlug,
            type: 'sale',
            price: 20,
        });

        expect(prod1.id).toBeDefined();
        expect(prod2.id).toBeDefined();
        expect(prod1.id).not.toBe(prod2.id);

        const foundShop1 = await productRepo.findBySlug(shop.id, sharedSlug);
        const foundShop2 = await productRepo.findBySlug(shop2Id, sharedSlug);

        expect(foundShop1?.id).toBe(prod1.id);
        expect(foundShop2?.id).toBe(prod2.id);
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
        await expect(productRepo.delete(faker.string.uuid())).rejects.toThrow(
            ProductNotFoundError,
        );
    });
});

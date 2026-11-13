import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../../../db/postgres/index.js';
import {
    usersTable,
    shops,
    stock,
} from '../../../db/postgres/schemas/index.js';
import { user, shop } from '../../../tests/index.js';
import { PostgresProductRepository } from './product-repository.js';
import { PostgresBundleItemRepository } from './bundle-item-repository.js';
import { faker } from '@faker-js/faker';

describe('Postgres BundleItem Repository', () => {
    let productRepo: PostgresProductRepository;
    let bundleItemRepo: PostgresBundleItemRepository;

    beforeEach(async () => {
        productRepo = new PostgresProductRepository();
        bundleItemRepo = new PostgresBundleItemRepository();

        await db.insert(usersTable).values(user);
        await db.insert(shops).values({
            id: shop.id,
            name: shop.name,
            description: shop.description,
        });
    });

    it('should create bundle items, find them by bundle id with component details, and check isComponentInAnyBundle', async () => {
        const component1 = await productRepo.create({
            shop_id: shop.id,
            name: 'Chair',
            slug: `chair-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 50,
        });

        const component2 = await productRepo.create({
            shop_id: shop.id,
            name: 'Table',
            slug: `table-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 100,
        });

        const bundle = await productRepo.create({
            shop_id: shop.id,
            name: 'Dining Set',
            slug: `dining-set-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 200,
            is_bundle: true,
        });

        const items = await bundleItemRepo.createMany([
            {
                bundle_product_id: bundle.id,
                product_id: component1.id,
                quantity: 4,
            },
            {
                bundle_product_id: bundle.id,
                product_id: component2.id,
                quantity: 1,
            },
        ]);

        expect(items.length).toBe(2);

        const found = await bundleItemRepo.findByBundleId(bundle.id);
        expect(found.length).toBe(2);

        const foundComp1 = found.find((i) => i.productId === component1.id);
        expect(foundComp1).toBeDefined();
        expect(foundComp1?.quantity).toBe(4);
        expect(foundComp1?.componentProduct?.name).toBe('Chair');

        const foundComp2 = found.find((i) => i.productId === component2.id);
        expect(foundComp2).toBeDefined();
        expect(foundComp2?.quantity).toBe(1);
        expect(foundComp2?.componentProduct?.name).toBe('Table');

        // Test isComponentInAnyBundle
        expect(await bundleItemRepo.isComponentInAnyBundle(component1.id)).toBe(
            true,
        );
        expect(await bundleItemRepo.isComponentInAnyBundle(component2.id)).toBe(
            true,
        );
        expect(
            await bundleItemRepo.isComponentInAnyBundle(faker.string.uuid()),
        ).toBe(false);
    });

    it('should cascade delete bundle items when bundle product is deleted', async () => {
        const component = await productRepo.create({
            shop_id: shop.id,
            name: 'Plate',
            slug: `plate-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 10,
        });

        const bundle = await productRepo.create({
            shop_id: shop.id,
            name: 'Dinner Bundle',
            slug: `dinner-bundle-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 40,
            is_bundle: true,
        });

        await bundleItemRepo.createMany([
            {
                bundle_product_id: bundle.id,
                product_id: component.id,
                quantity: 6,
            },
        ]);

        expect(await bundleItemRepo.isComponentInAnyBundle(component.id)).toBe(
            true,
        );

        // Delete bundle
        await productRepo.delete(bundle.id);

        const remainingItems = await bundleItemRepo.findByBundleId(bundle.id);
        expect(remainingItems.length).toBe(0);
        expect(await bundleItemRepo.isComponentInAnyBundle(component.id)).toBe(
            false,
        );

        // Component product still exists
        const stillComponent = await productRepo.findById(component.id);
        expect(stillComponent).not.toBeNull();
    });

    it('should load component product stock and available stock across findByBundleId and findByBundleIds', async () => {
        const component = await productRepo.create({
            shop_id: shop.id,
            name: 'Glasses',
            slug: `glasses-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 5,
        });

        // Insert stock for component (quantity: 20, reserved: 4 -> available: 16)
        await db.insert(stock).values({
            product_id: component.id,
            quantity: 20,
            reserved: 4,
        });

        const bundle1 = await productRepo.create({
            shop_id: shop.id,
            name: 'Glasses Pack',
            slug: `glasses-pack-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 25,
            is_bundle: true,
        });

        const bundle2 = await productRepo.create({
            shop_id: shop.id,
            name: 'Party Set',
            slug: `party-set-${faker.string.alphanumeric(8)}`,
            type: 'sale',
            price: 50,
            is_bundle: true,
        });

        await bundleItemRepo.createMany([
            {
                bundle_product_id: bundle1.id,
                product_id: component.id,
                quantity: 4,
            },
            {
                bundle_product_id: bundle2.id,
                product_id: component.id,
                quantity: 2,
            },
        ]);

        // Test findByBundleId
        const itemsBundle1 = await bundleItemRepo.findByBundleId(bundle1.id);
        expect(itemsBundle1.length).toBe(1);
        expect(itemsBundle1[0].stock).toBeDefined();
        expect(itemsBundle1[0].stock?.quantity).toBe(20);
        expect(itemsBundle1[0].stock?.reserved).toBe(4);
        expect(itemsBundle1[0].stock?.available_stock).toBe(16);
        expect(itemsBundle1[0].componentProduct?.stock?.quantity).toBe(20);

        // Test findByBundleIds
        const multiItems = await bundleItemRepo.findByBundleIds([
            bundle1.id,
            bundle2.id,
        ]);
        expect(multiItems.length).toBe(2);

        const b1Item = multiItems.find((i) => i.bundleProductId === bundle1.id);
        expect(b1Item).toBeDefined();
        expect(b1Item?.stock?.available_stock).toBe(16);

        const b2Item = multiItems.find((i) => i.bundleProductId === bundle2.id);
        expect(b2Item).toBeDefined();
        expect(b2Item?.stock?.available_stock).toBe(16);
    });
});

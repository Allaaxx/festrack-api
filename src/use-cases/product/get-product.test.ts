import { describe, it, expect, mock } from 'bun:test';
import { GetProductUseCase } from './get-product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { ProductNotFoundError } from '../../errors/product.js';
import {
    ProductWithStock,
    Shop,
    ShopMember,
    BundleItem,
} from '../../domain/index.js';

describe('Get Product Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'Party Rentals',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const fakeMember: ShopMember = {
        id: 'member-1',
        shop_id: 'shop-1',
        user_id: 'user-1',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const fakeProduct: ProductWithStock = {
        id: 'prod-1',
        shop_id: 'shop-1',
        name: 'Tent',
        slug: 'tent',
        type: 'rent',
        price: '50.00',
        description: null,
        images: [],
        is_bundle: false,
        created_at: new Date(),
        updated_at: new Date(),
        available_stock: 5,
        availableStock: 5,
        stock: {
            id: 'stock-1',
            product_id: 'prod-1',
            quantity: 5,
            reserved: 0,
            available_stock: 5,
            availableStock: 5,
            updated_at: new Date(),
        },
    };

    it('should retrieve a product by id with its stock', async () => {
        const productRepo = {
            findByIdWithStock: mock(async () => fakeProduct),
        };
        const shopRepo = {
            findById: mock(async () => fakeShop),
        };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        const result = await useCase.execute('shop-1', 'prod-1', 'user-1');
        expect(result).toEqual(fakeProduct);
        expect(productRepo.findByIdWithStock).toHaveBeenCalledWith('prod-1');
    });

    it('should throw ProductNotFoundError when product does not exist', async () => {
        const productRepo = {
            findByIdWithStock: mock(async () => null),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('shop-1', 'non-existent', 'user-1'),
        ).rejects.toThrow(ProductNotFoundError);
    });

    it('should throw ProductNotFoundError when product belongs to another shop', async () => {
        const otherShopProduct: ProductWithStock = {
            ...fakeProduct,
            shop_id: 'shop-2',
        };
        const productRepo = {
            findByIdWithStock: mock(async () => otherShopProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('shop-1', 'prod-1', 'user-1'),
        ).rejects.toThrow(ProductNotFoundError);
    });

    it('should throw ShopNotFoundError when shop does not exist', async () => {
        const productRepo = {
            findByIdWithStock: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => null) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('ghost-shop', 'prod-1', 'user-1'),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError when user is not a member', async () => {
        const productRepo = {
            findByIdWithStock: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('shop-1', 'prod-1', 'stranger'),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should retrieve a bundle product and embed its bundle items', async () => {
        const bundleProduct: ProductWithStock = {
            id: 'bundle-1',
            shop_id: 'shop-1',
            name: 'Party Bundle',
            slug: 'party-bundle',
            type: 'sale',
            price: '199.99',
            description: null,
            images: [],
            is_bundle: true,
            created_at: new Date(),
            updated_at: new Date(),
            stock: null,
        };

        const bundleItems: BundleItem[] = [
            {
                id: 'bi-1',
                bundleProductId: 'bundle-1',
                bundle_product_id: 'bundle-1',
                productId: 'comp-1',
                product_id: 'comp-1',
                quantity: 2,
                available_stock: 5,
                availableStock: 5,
                stock: {
                    id: 'stock-comp-1',
                    product_id: 'comp-1',
                    quantity: 10,
                    reserved: 0,
                    available_stock: 10,
                    availableStock: 10,
                    updated_at: new Date(),
                },
                componentProduct: {
                    id: 'comp-1',
                    shop_id: 'shop-1',
                    name: 'Chair',
                    slug: 'chair',
                    type: 'sale',
                    price: '50.00',
                    description: null,
                    images: [],
                    is_bundle: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    available_stock: 10,
                    availableStock: 10,
                    stock: {
                        id: 'stock-comp-1',
                        product_id: 'comp-1',
                        quantity: 10,
                        reserved: 0,
                        available_stock: 10,
                        availableStock: 10,
                        updated_at: new Date(),
                    },
                },
                createdAt: new Date(),
                created_at: new Date(),
                updatedAt: new Date(),
                updated_at: new Date(),
            },
        ];

        const productRepo = {
            findByIdWithStock: mock(async () => bundleProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = {
            findByBundleId: mock(async () => bundleItems),
        };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
        );

        const result = await useCase.execute('shop-1', 'bundle-1', 'user-1');
        expect(result.id).toBe('bundle-1');
        expect(result.is_bundle).toBe(true);
        expect(result.stock).toBeNull();
        expect(result.available_stock).toBe(5);
        expect(result.availableStock).toBe(5);
        expect(result.bundleItems).toEqual(bundleItems);
        expect(bundleRepo.findByBundleId).toHaveBeenCalledWith('bundle-1');
    });

    it('should retrieve a service product with null stock', async () => {
        const serviceProduct: ProductWithStock = {
            id: 'service-1',
            shop_id: 'shop-1',
            name: 'DJ Service',
            slug: 'dj-service',
            type: 'service',
            price: '300.00',
            description: null,
            images: [],
            is_bundle: false,
            created_at: new Date(),
            updated_at: new Date(),
            stock: null,
        };

        const productRepo = {
            findByIdWithStock: mock(async () => serviceProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new GetProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );
        const result = await useCase.execute('shop-1', 'service-1', 'user-1');

        expect(result.id).toBe('service-1');
        expect(result.type).toBe('service');
        expect(result.stock).toBeNull();
        expect(result.available_stock).toBeUndefined();
    });
});

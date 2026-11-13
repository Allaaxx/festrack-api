import { describe, it, expect, mock } from 'bun:test';
import { CreateProductUseCase } from './create-product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    SlugAlreadyExistsError,
    InvalidBundleComponentError,
} from '../../errors/product.js';
import {
    Product,
    Stock,
    Shop,
    ShopMember,
    BundleItem,
} from '../../domain/index.js';

describe('Create Product Use Case', () => {
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
        role: 'OWNER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const fakeProduct: Product = {
        id: 'prod-1',
        shop_id: 'shop-1',
        name: 'Tent',
        slug: 'tent-large',
        type: 'rent',
        price: '100.00',
        description: 'Large tent',
        images: [],
        is_bundle: false,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const fakeStock: Stock = {
        id: 'stock-1',
        product_id: 'prod-1',
        quantity: 10,
        reserved: 0,
        updated_at: new Date(),
    };

    it('should create product with stock when type is rent or sale and record initial stock movement', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
        };
        const stockRepo = {
            create: mock(async () => fakeStock),
        };
        const stockMovementRepo = {
            create: mock(async (params: any) => ({ id: 'mov-1', ...params })),
        };
        const shopRepo = {
            findById: mock(async () => fakeShop),
        };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
            undefined,
            stockMovementRepo as any,
        );

        const result = await useCase.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            name: 'Tent',
            slug: 'tent-large',
            type: 'rent',
            price: 100,
            initial_quantity: 10,
        });

        expect(result.id).toBe('prod-1');
        expect(result.stock).toEqual(fakeStock);
        expect(stockRepo.create).toHaveBeenCalledWith({
            product_id: 'prod-1',
            quantity: 10,
            reserved: 0,
        });
        expect(productRepo.findBySlug).toHaveBeenCalledWith(
            'shop-1',
            'tent-large',
        );
        expect(stockMovementRepo.create).toHaveBeenCalledWith({
            stockId: 'stock-1',
            type: 'INBOUND',
            quantity: 10,
            notes: 'Initial stock entry',
            createdByUserId: 'user-1',
        });
    });

    it('should create product without stock when type is service', async () => {
        const serviceProduct: Product = {
            ...fakeProduct,
            type: 'service',
        };
        const productRepo = {
            create: mock(async () => serviceProduct),
            findBySlug: mock(async () => null),
        };
        const stockRepo = {
            create: mock(async () => fakeStock),
        };
        const shopRepo = {
            findById: mock(async () => fakeShop),
        };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
        );

        const result = await useCase.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            name: 'Setup Service',
            slug: 'setup-service',
            type: 'service',
            price: 50,
        });

        expect(result.stock).toBeNull();
        expect(stockRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ShopNotFoundError when shop does not exist', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => null) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'non-existent',
                userId: 'user-1',
                name: 'Tent',
                slug: 'tent',
                type: 'sale',
                price: 10,
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError when user is not a shop member', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'shop-1',
                userId: 'stranger',
                name: 'Tent',
                slug: 'tent',
                type: 'sale',
                price: 10,
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw SlugAlreadyExistsError when slug is taken', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => fakeProduct),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                name: 'Tent',
                slug: 'tent-large',
                type: 'sale',
                price: 10,
            }),
        ).rejects.toThrow(SlugAlreadyExistsError);
    });

    it('should create a bundle product with components and no stock record', async () => {
        const bundleProduct: Product = {
            ...fakeProduct,
            id: 'bundle-1',
            name: 'Party Kit',
            slug: 'party-kit',
            is_bundle: true,
        };

        const comp1: Product = {
            ...fakeProduct,
            id: 'comp-1',
            name: 'Chair',
            slug: 'chair',
            is_bundle: false,
        };
        const comp2: Product = {
            ...fakeProduct,
            id: 'comp-2',
            name: 'Table',
            slug: 'table',
            is_bundle: false,
        };

        const fakeItems: BundleItem[] = [
            {
                id: 'bi-1',
                bundleProductId: 'bundle-1',
                bundle_product_id: 'bundle-1',
                productId: 'comp-1',
                product_id: 'comp-1',
                quantity: 4,
                createdAt: new Date(),
                created_at: new Date(),
                updatedAt: new Date(),
                updated_at: new Date(),
            },
            {
                id: 'bi-2',
                bundleProductId: 'bundle-1',
                bundle_product_id: 'bundle-1',
                productId: 'comp-2',
                product_id: 'comp-2',
                quantity: 1,
                createdAt: new Date(),
                created_at: new Date(),
                updatedAt: new Date(),
                updated_at: new Date(),
            },
        ];

        const productRepo = {
            create: mock(async () => bundleProduct),
            findBySlug: mock(async () => null),
            findById: mock(async (id: string) => {
                if (id === 'comp-1') return comp1;
                if (id === 'comp-2') return comp2;
                return null;
            }),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = {
            createMany: mock(async () => fakeItems),
        };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
            async (fn) => fn(undefined),
        );

        const result = await useCase.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            name: 'Party Kit',
            slug: 'party-kit',
            type: 'sale',
            price: 250,
            isBundle: true,
            bundleItems: [
                { productId: 'comp-1', quantity: 4 },
                { productId: 'comp-2', quantity: 1 },
            ],
        });

        expect(result.id).toBe('bundle-1');
        expect(result.is_bundle).toBe(true);
        expect(result.stock).toBeNull();
        expect(result.bundleItems).toEqual(fakeItems);
        expect(stockRepo.create).not.toHaveBeenCalled();
        expect(bundleRepo.createMany).toHaveBeenCalledWith([
            {
                bundle_product_id: 'bundle-1',
                product_id: 'comp-1',
                quantity: 4,
            },
            {
                bundle_product_id: 'bundle-1',
                product_id: 'comp-2',
                quantity: 1,
            },
        ]);
    });

    it('should throw InvalidBundleComponentError when bundle has no items or empty array', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
            findById: mock(async () => null),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = { createMany: mock(async () => []) };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                name: 'Empty Bundle',
                slug: 'empty-bundle',
                type: 'sale',
                price: 100,
                isBundle: true,
                bundleItems: [],
            }),
        ).rejects.toThrow(InvalidBundleComponentError);
    });

    it('should throw InvalidBundleComponentError when component product is not found', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
            findById: mock(async () => null),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = { createMany: mock(async () => []) };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                name: 'Broken Bundle',
                slug: 'broken-bundle',
                type: 'sale',
                price: 100,
                isBundle: true,
                bundleItems: [{ productId: 'missing-id', quantity: 1 }],
            }),
        ).rejects.toThrow(InvalidBundleComponentError);
    });

    it('should throw InvalidBundleComponentError when component belongs to another shop', async () => {
        const foreignComponent: Product = {
            ...fakeProduct,
            id: 'foreign-comp',
            shop_id: 'other-shop',
        };

        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
            findById: mock(async () => foreignComponent),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = { createMany: mock(async () => []) };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                name: 'Cross Shop Bundle',
                slug: 'cross-shop-bundle',
                type: 'sale',
                price: 100,
                isBundle: true,
                bundleItems: [{ productId: 'foreign-comp', quantity: 1 }],
            }),
        ).rejects.toThrow(InvalidBundleComponentError);
    });

    it('should throw InvalidBundleComponentError when component product is itself a bundle', async () => {
        const nestedBundle: Product = {
            ...fakeProduct,
            id: 'nested-bundle',
            is_bundle: true,
        };

        const productRepo = {
            create: mock(async () => fakeProduct),
            findBySlug: mock(async () => null),
            findById: mock(async () => nestedBundle),
        };
        const stockRepo = { create: mock(async () => fakeStock) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = { createMany: mock(async () => []) };

        const useCase = new CreateProductUseCase(
            productRepo,
            stockRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
        );

        await expect(
            useCase.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                name: 'Nested Bundle',
                slug: 'nested-bundle',
                type: 'sale',
                price: 100,
                isBundle: true,
                bundleItems: [{ productId: 'nested-bundle', quantity: 1 }],
            }),
        ).rejects.toThrow(InvalidBundleComponentError);
    });
});

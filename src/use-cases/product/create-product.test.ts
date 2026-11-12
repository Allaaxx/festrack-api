import { describe, it, expect, mock } from 'bun:test';
import { CreateProductUseCase } from './create-product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { SlugAlreadyExistsError } from '../../errors/product.js';
import { Product, Stock, Shop, ShopMember } from '../../domain/index.js';

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

    it('should create product with stock when type is rent or sale', async () => {
        const productRepo = {
            create: mock(async () => fakeProduct),
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
});

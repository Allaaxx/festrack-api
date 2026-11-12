import { describe, it, expect, mock } from 'bun:test';
import { ListProductsUseCase } from './list-products.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { ProductWithStock, Shop, ShopMember } from '../../domain/index.js';

describe('List Products Use Case', () => {
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

    const fakeProducts: ProductWithStock[] = [
        {
            id: 'prod-1',
            shop_id: 'shop-1',
            name: 'Tent',
            slug: 'tent',
            type: 'sale',
            price: '50.00',
            description: null,
            images: [],
            is_bundle: false,
            created_at: new Date(),
            updated_at: new Date(),
            stock: {
                id: 'stock-1',
                product_id: 'prod-1',
                quantity: 5,
                reserved: 0,
                updated_at: new Date(),
            },
        },
    ];

    it('should list products for the shop', async () => {
        const productRepo = {
            findByShopId: mock(async () => fakeProducts),
        };
        const shopRepo = {
            findById: mock(async () => fakeShop),
        };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new ListProductsUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        const result = await useCase.execute('shop-1', 'user-1');
        expect(result).toEqual(fakeProducts);
        expect(productRepo.findByShopId).toHaveBeenCalledWith(
            'shop-1',
            undefined,
        );
    });

    it('should pass type filter to repository when provided', async () => {
        const productRepo = {
            findByShopId: mock(async () => fakeProducts),
        };
        const shopRepo = {
            findById: mock(async () => fakeShop),
        };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new ListProductsUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await useCase.execute('shop-1', 'user-1', 'sale');
        expect(productRepo.findByShopId).toHaveBeenCalledWith('shop-1', {
            type: 'sale',
        });
    });

    it('should throw ShopNotFoundError when shop does not exist', async () => {
        const productRepo = { findByShopId: mock(async () => []) };
        const shopRepo = { findById: mock(async () => null) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new ListProductsUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(useCase.execute('ghost-shop', 'user-1')).rejects.toThrow(
            ShopNotFoundError,
        );
    });

    it('should throw ForbiddenError when user is not a member', async () => {
        const productRepo = { findByShopId: mock(async () => []) };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new ListProductsUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(useCase.execute('shop-1', 'intruder')).rejects.toThrow(
            ForbiddenError,
        );
    });
});

import { describe, it, expect, mock } from 'bun:test';
import { DeleteProductUseCase } from './delete-product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductNotFoundError,
    CannotDeleteProductInBundleError,
} from '../../errors/product.js';
import { Product, Shop, ShopMember } from '../../domain/index.js';

describe('Delete Product Use Case', () => {
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
        slug: 'tent',
        type: 'rent',
        price: '50.00',
        description: null,
        images: [],
        is_bundle: false,
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should delete a product', async () => {
        const productRepo = {
            findById: mock(async () => fakeProduct),
            delete: mock(async () => fakeProduct),
        };
        const shopRepo = {
            findById: mock(async () => fakeShop),
        };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new DeleteProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        const result = await useCase.execute('shop-1', 'prod-1', 'user-1');
        expect(result).toEqual(fakeProduct);
        expect(productRepo.delete).toHaveBeenCalledWith('prod-1');
    });

    it('should throw ProductNotFoundError when product does not exist', async () => {
        const productRepo = {
            findById: mock(async () => null),
            delete: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new DeleteProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('shop-1', 'ghost-prod', 'user-1'),
        ).rejects.toThrow(ProductNotFoundError);
    });

    it('should throw ProductNotFoundError when product belongs to another shop', async () => {
        const otherProduct: Product = {
            ...fakeProduct,
            shop_id: 'shop-2',
        };
        const productRepo = {
            findById: mock(async () => otherProduct),
            delete: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new DeleteProductUseCase(
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
            findById: mock(async () => fakeProduct),
            delete: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => null) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new DeleteProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('ghost-shop', 'prod-1', 'user-1'),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError when user is not a shop member', async () => {
        const productRepo = {
            findById: mock(async () => fakeProduct),
            delete: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = { findByShopAndUserId: mock(async () => null) };

        const useCase = new DeleteProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
        );

        await expect(
            useCase.execute('shop-1', 'prod-1', 'stranger'),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw CannotDeleteProductInBundleError when product is component in an active bundle', async () => {
        const productRepo = {
            findById: mock(async () => fakeProduct),
            delete: mock(async () => fakeProduct),
        };
        const shopRepo = { findById: mock(async () => fakeShop) };
        const memberRepo = {
            findByShopAndUserId: mock(async () => fakeMember),
        };
        const bundleRepo = {
            isComponentInAnyBundle: mock(async () => true),
        };

        const useCase = new DeleteProductUseCase(
            productRepo,
            shopRepo,
            memberRepo,
            bundleRepo,
        );

        await expect(
            useCase.execute('shop-1', 'prod-1', 'user-1'),
        ).rejects.toThrow(CannotDeleteProductInBundleError);
        expect(productRepo.delete).not.toHaveBeenCalled();
    });
});

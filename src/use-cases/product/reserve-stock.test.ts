import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ReserveStockUseCase } from './reserve-stock.js';
import {
    Product,
    Stock,
    StockMovement,
    BundleItem,
} from '../../domain/index.js';
import {
    ProductNotFoundError,
    InsufficientStockError,
    InvalidStockAdjustmentError,
} from '../../errors/product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('ReserveStockUseCase (Unit Tests)', () => {
    let sut: ReserveStockUseCase;
    let productRepo: { findById: ReturnType<typeof mock> };
    let stockRepo: {
        findByProductId: ReturnType<typeof mock>;
        update: ReturnType<typeof mock>;
        findManyByProductIdsWithLock: ReturnType<typeof mock>;
    };
    let stockMovementRepo: { create: ReturnType<typeof mock> };
    let shopRepo: { findById: ReturnType<typeof mock> };
    let shopMemberRepo: { findByShopAndUserId: ReturnType<typeof mock> };
    let bundleItemRepo: { findByBundleId: ReturnType<typeof mock> };

    const mockShop = { id: 'shop-1', name: 'Test Shop' };
    const mockMember = {
        id: 'member-1',
        shop_id: 'shop-1',
        user_id: 'user-1',
        role: 'MEMBER',
    };

    const simpleProduct: Product = {
        id: 'prod-chair',
        shop_id: 'shop-1',
        name: 'Party Chair',
        slug: 'party-chair',
        type: 'sale',
        price: '50.00',
        description: null,
        images: [],
        is_bundle: false,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const bundleProduct: Product = {
        id: 'prod-bundle',
        shop_id: 'shop-1',
        name: 'Party Pack',
        slug: 'party-pack',
        type: 'sale',
        price: '150.00',
        description: null,
        images: [],
        is_bundle: true,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const serviceProduct: Product = {
        id: 'prod-service',
        shop_id: 'shop-1',
        name: 'DJ Service',
        slug: 'dj-service',
        type: 'service',
        price: '200.00',
        description: null,
        images: [],
        is_bundle: false,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const chairStock: Stock = {
        id: 'stock-chair',
        product_id: 'prod-chair',
        quantity: 20,
        reserved: 5,
        available_stock: 15,
        availableStock: 15,
        updated_at: new Date(),
    };

    const mockBundleItems: BundleItem[] = [
        {
            id: 'bi-1',
            bundleProductId: 'prod-bundle',
            bundle_product_id: 'prod-bundle',
            productId: 'prod-chair',
            product_id: 'prod-chair',
            quantity: 4,
            createdAt: new Date(),
            created_at: new Date(),
            updatedAt: new Date(),
            updated_at: new Date(),
        },
    ];

    beforeEach(() => {
        productRepo = {
            findById: mock((id: string) => {
                if (id === 'prod-chair') return Promise.resolve(simpleProduct);
                if (id === 'prod-bundle') return Promise.resolve(bundleProduct);
                if (id === 'prod-service')
                    return Promise.resolve(serviceProduct);
                return Promise.resolve(null);
            }),
        };

        stockRepo = {
            findByProductId: mock((id: string) => {
                if (id === 'prod-chair') return Promise.resolve(chairStock);
                return Promise.resolve(null);
            }),
            update: mock((id: string, params: any) =>
                Promise.resolve({
                    ...chairStock,
                    ...params,
                }),
            ),
            findManyByProductIdsWithLock: mock((ids: string[]) => {
                const results: Stock[] = [];
                if (ids.includes('prod-chair')) results.push(chairStock);
                return Promise.resolve(results);
            }),
        };

        stockMovementRepo = {
            create: mock((params: any) =>
                Promise.resolve({
                    id: 'mov-1',
                    stockId: params.stockId,
                    type: params.type,
                    quantity: params.quantity,
                    notes: params.notes,
                    referenceId: params.referenceId,
                    createdByUserId: params.createdByUserId,
                    createdAt: new Date(),
                } as StockMovement),
            ),
        };

        shopRepo = {
            findById: mock((id: string) => {
                if (id === 'shop-1') return Promise.resolve(mockShop);
                return Promise.resolve(null);
            }),
        };

        shopMemberRepo = {
            findByShopAndUserId: mock((shopId: string, userId: string) => {
                if (shopId === 'shop-1' && userId === 'user-1') {
                    return Promise.resolve(mockMember);
                }
                return Promise.resolve(null);
            }),
        };

        bundleItemRepo = {
            findByBundleId: mock((bundleId: string) => {
                if (bundleId === 'prod-bundle')
                    return Promise.resolve(mockBundleItems);
                return Promise.resolve([]);
            }),
        };

        const passthroughTx = async <T>(
            fn: (tx?: any) => Promise<T>,
        ): Promise<T> => {
            return await fn({});
        };

        sut = new ReserveStockUseCase(
            productRepo,
            stockRepo as any,
            stockMovementRepo as any,
            shopRepo as any,
            shopMemberRepo as any,
            bundleItemRepo as any,
            passthroughTx,
        );
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        await expect(
            sut.execute({
                shopId: 'non-existent',
                userId: 'user-1',
                items: [{ productId: 'prod-chair', quantity: 2 }],
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError if user is not a member of the shop', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'stranger',
                items: [{ productId: 'prod-chair', quantity: 2 }],
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ProductNotFoundError if product does not exist or belongs to another shop', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [{ productId: 'unknown-prod', quantity: 2 }],
            }),
        ).rejects.toThrow(ProductNotFoundError);
    });

    it('should throw InvalidStockAdjustmentError if quantity is less than 1', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [{ productId: 'prod-chair', quantity: 0 }],
            }),
        ).rejects.toThrow(InvalidStockAdjustmentError);
    });

    it('should successfully reserve stock for a simple product', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            referenceId: 'ref-order-1',
            notes: 'Checkout reservation',
            items: [{ productId: 'prod-chair', quantity: 3, type: 'sale' }],
        });

        expect(result.success).toBe(true);
        expect(result.items.length).toBe(1);
        expect(result.items[0].productId).toBe('prod-chair');
        expect(result.items[0].quantity).toBe(3);
        expect(result.items[0].reservedQuantity).toBe(8); // 5 + 3
        expect(stockRepo.findManyByProductIdsWithLock).toHaveBeenCalledWith(
            ['prod-chair'],
            expect.anything(),
        );
        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-chair',
            { reserved: 8 },
            expect.anything(),
        );
        expect(stockMovementRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stockId: 'stock-chair',
                type: 'SALE',
                quantity: 3,
                referenceId: 'ref-order-1',
                notes: 'Checkout reservation',
                createdByUserId: 'user-1',
            }),
            expect.anything(),
        );
    });

    it('should successfully reserve stock for a bundle product multiplying component quantities', async () => {
        // Bundle requires 4 chairs per bundle. Reserving 2 bundles = 8 chairs.
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            items: [{ productId: 'prod-bundle', quantity: 2 }],
        });

        expect(result.success).toBe(true);
        expect(result.items.length).toBe(1);
        expect(result.items[0].productId).toBe('prod-chair');
        expect(result.items[0].quantity).toBe(8); // 4 * 2
        expect(result.items[0].reservedQuantity).toBe(13); // 5 + 8
        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-chair',
            { reserved: 13 },
            expect.anything(),
        );
    });

    it('should aggregate required quantities when multiple items share the same component', async () => {
        // Item 1: 1 simple chair (qty: 2)
        // Item 2: 1 bundle (qty: 1, contains 4 chairs)
        // Total required: 2 + 4 = 6 chairs.
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            items: [
                { productId: 'prod-chair', quantity: 2 },
                { productId: 'prod-bundle', quantity: 1 },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.items.length).toBe(1);
        expect(result.items[0].quantity).toBe(6);
        expect(result.items[0].reservedQuantity).toBe(11); // 5 + 6
        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-chair',
            { reserved: 11 },
            expect.anything(),
        );
    });

    it('should skip physical stock for service products', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            items: [{ productId: 'prod-service', quantity: 1 }],
        });

        expect(result.success).toBe(true);
        expect(result.items.length).toBe(0);
        expect(result.movements.length).toBe(0);
        expect(stockRepo.findManyByProductIdsWithLock).not.toHaveBeenCalled();
    });

    it('should throw InsufficientStockError when requested quantity exceeds available stock', async () => {
        // Chair has quantity 20, reserved 5 -> available is 15. Requesting 16 should fail.
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [{ productId: 'prod-chair', quantity: 16 }],
            }),
        ).rejects.toThrow(InsufficientStockError);

        expect(stockRepo.update).not.toHaveBeenCalled();
        expect(stockMovementRepo.create).not.toHaveBeenCalled();
    });

    it('should throw InsufficientStockError when bundle has no bundle items', async () => {
        bundleItemRepo.findByBundleId = mock(() => Promise.resolve([]));

        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [{ productId: 'prod-bundle', quantity: 1 }],
            }),
        ).rejects.toThrow(InsufficientStockError);
    });
});

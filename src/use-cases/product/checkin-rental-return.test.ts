import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CheckinRentalReturnUseCase } from './checkin-rental-return.js';
import {
    Product,
    Stock,
    StockMovement,
    BundleItem,
} from '../../domain/index.js';
import {
    ProductNotFoundError,
    StockNotFoundError,
    InvalidRentalReturnError,
} from '../../errors/product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('CheckinRentalReturnUseCase (Unit Tests)', () => {
    let sut: CheckinRentalReturnUseCase;
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
        type: 'rent',
        price: '20.00',
        description: null,
        images: [],
        is_bundle: false,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const bundleProduct: Product = {
        id: 'prod-bundle',
        shop_id: 'shop-1',
        name: 'Party Kit',
        slug: 'party-kit',
        type: 'rent',
        price: '100.00',
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

    let chairStock: Stock;

    const mockBundleItems: BundleItem[] = [
        {
            id: 'bi-1',
            bundleProductId: 'prod-bundle',
            bundle_product_id: 'prod-bundle',
            productId: 'prod-chair',
            product_id: 'prod-chair',
            quantity: 3,
            createdAt: new Date(),
            created_at: new Date(),
            updatedAt: new Date(),
            updated_at: new Date(),
            product: { ...simpleProduct, stock: null },
            componentProduct: { ...simpleProduct, stock: null },
        },
    ];

    beforeEach(() => {
        chairStock = {
            id: 'stock-chair',
            product_id: 'prod-chair',
            quantity: 10,
            reserved: 5,
            available_stock: 5,
            availableStock: 5,
            updated_at: new Date(),
        };

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
            update: mock((id: string, params: any) => {
                chairStock = {
                    ...chairStock,
                    ...params,
                };
                return Promise.resolve(chairStock);
            }),
            findManyByProductIdsWithLock: mock((ids: string[]) => {
                const results: Stock[] = [];
                if (ids.includes('prod-chair')) results.push(chairStock);
                return Promise.resolve(results);
            }),
        };

        stockMovementRepo = {
            create: mock((params: any) =>
                Promise.resolve({
                    id: `mov-${Math.random().toString(36).substring(7)}`,
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
                if (bundleId === 'prod-bundle') {
                    return Promise.resolve(mockBundleItems);
                }
                return Promise.resolve([]);
            }),
        };

        sut = new CheckinRentalReturnUseCase(
            productRepo as any,
            stockRepo as any,
            stockMovementRepo as any,
            shopRepo as any,
            shopMemberRepo as any,
            bundleItemRepo as any,
            async (fn) => await fn(),
        );
    });

    it('should successfully check in undamaged rental items', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            referenceId: 'ref-100',
            notes: 'Everything returned intact',
            items: [
                {
                    productId: 'prod-chair',
                    returnedQuantity: 3,
                    damagedQuantity: 0,
                },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.items.length).toBe(1);
        expect(result.items[0].currentQuantity).toBe(10);
        expect(result.items[0].currentReserved).toBe(2); // 5 - 3
        expect(stockRepo.update).toHaveBeenCalledWith('prod-chair', {
            quantity: 10,
            reserved: 2,
        });
        expect(stockMovementRepo.create).toHaveBeenCalledTimes(1);
        expect(result.movements[0].type).toBe('RENTAL_RETURN');
        expect(result.movements[0].quantity).toBe(3);
    });

    it('should successfully check in damaged items with damage notes', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            items: [
                {
                    productId: 'prod-chair',
                    returnedQuantity: 2,
                    damagedQuantity: 2,
                    notes: 'Two chairs broken during transit',
                },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.items[0].currentQuantity).toBe(8); // 10 - 2
        expect(result.items[0].currentReserved).toBe(1); // 5 - (2 + 2)
        expect(stockRepo.update).toHaveBeenCalledWith('prod-chair', {
            quantity: 8,
            reserved: 1,
        });
        expect(stockMovementRepo.create).toHaveBeenCalledTimes(2);

        const types = result.movements.map((m) => m.type);
        expect(types).toContain('RENTAL_RETURN');
        expect(types).toContain('LOSS');
    });

    it('should check in bundle product by resolving into components', async () => {
        // Bundle multiplier is 3 chairs per bundle
        // Returning 1 bundle: 1 intact -> 3 chairs returned
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            items: [
                {
                    productId: 'prod-bundle',
                    returnedQuantity: 1,
                    damagedQuantity: 0,
                },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.items.length).toBe(1);
        expect(result.items[0].productId).toBe('prod-chair');
        expect(result.items[0].returnedQuantity).toBe(3);
        expect(result.items[0].currentReserved).toBe(2); // 5 - 3
    });

    it('should return empty success when items array is empty', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'user-1',
            items: [],
        });

        expect(result.success).toBe(true);
        expect(result.items).toEqual([]);
        expect(result.movements).toEqual([]);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        await expect(
            sut.execute({
                shopId: 'non-existent',
                userId: 'user-1',
                items: [{ productId: 'prod-chair', returnedQuantity: 1 }],
            }),
        ).rejects.toBeInstanceOf(ShopNotFoundError);
    });

    it('should throw ForbiddenError if user is not a shop member', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'outsider',
                items: [{ productId: 'prod-chair', returnedQuantity: 1 }],
            }),
        ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('should throw ProductNotFoundError if product does not exist', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [{ productId: 'unknown-prod', returnedQuantity: 1 }],
            }),
        ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('should throw InvalidRentalReturnError if damagedQuantity > 0 but damage notes are missing', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [
                    {
                        productId: 'prod-chair',
                        returnedQuantity: 1,
                        damagedQuantity: 1,
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(InvalidRentalReturnError);
    });

    it('should throw InvalidRentalReturnError if returned + damaged exceeds reserved quantity', async () => {
        // Reserved is 5. Returning 4 + damaged 2 = 6 > 5
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [
                    {
                        productId: 'prod-chair',
                        returnedQuantity: 4,
                        damagedQuantity: 2,
                        notes: 'Broken',
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(InvalidRentalReturnError);
    });

    it('should throw InvalidRentalReturnError if both returned and damaged quantities are 0', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [
                    {
                        productId: 'prod-chair',
                        returnedQuantity: 0,
                        damagedQuantity: 0,
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(InvalidRentalReturnError);
    });

    it('should throw StockNotFoundError if stock record is missing for locked component', async () => {
        stockRepo.findManyByProductIdsWithLock.mockResolvedValueOnce([]);

        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'user-1',
                items: [
                    {
                        productId: 'prod-chair',
                        returnedQuantity: 1,
                        damagedQuantity: 0,
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(StockNotFoundError);
    });
});

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { RecordStockAdjustmentUseCase } from './record-stock-adjustment.js';
import {
    ProductRepository,
    StockRepository,
    StockMovementRepository,
    ShopRepository,
    ShopMemberRepository,
    Product,
    Stock,
    StockMovement,
} from '../../domain/index.js';
import {
    InvalidStockAdjustmentError,
    ProductNotFoundError,
} from '../../errors/product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('RecordStockAdjustmentUseCase', () => {
    let sut: RecordStockAdjustmentUseCase;
    let productRepo: { findById: ReturnType<typeof mock> };
    let stockRepo: {
        findByProductId: ReturnType<typeof mock>;
        update: ReturnType<typeof mock>;
    };
    let stockMovementRepo: { create: ReturnType<typeof mock> };
    let shopRepo: { findById: ReturnType<typeof mock> };
    let shopMemberRepo: { findByShopAndUserId: ReturnType<typeof mock> };

    const mockShop = { id: 'shop-1', name: 'Test Shop' };
    const mockMember = {
        id: 'member-1',
        shop_id: 'shop-1',
        user_id: 'user-1',
        role: 'MEMBER',
    };
    const mockProduct: Product = {
        id: 'prod-1',
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
    const mockStock: Stock = {
        id: 'stock-1',
        product_id: 'prod-1',
        quantity: 20,
        reserved: 5,
        available_stock: 15,
        updated_at: new Date(),
    };

    beforeEach(() => {
        productRepo = {
            findById: mock(() => Promise.resolve(mockProduct)),
        };
        stockRepo = {
            findByProductId: mock(() => Promise.resolve(mockStock)),
            update: mock((_id, params) =>
                Promise.resolve({
                    ...mockStock,
                    ...params,
                    available_stock:
                        (params.quantity ?? mockStock.quantity) -
                        mockStock.reserved,
                }),
            ),
        };
        stockMovementRepo = {
            create: mock((params) =>
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
            findById: mock(() => Promise.resolve(mockShop)),
        };
        shopMemberRepo = {
            findByShopAndUserId: mock(() => Promise.resolve(mockMember)),
        };

        sut = new RecordStockAdjustmentUseCase(
            productRepo as unknown as Pick<ProductRepository, 'findById'>,
            stockRepo as unknown as Pick<
                StockRepository,
                'findByProductId' | 'update'
            >,
            stockMovementRepo as unknown as Pick<
                StockMovementRepository,
                'create'
            >,
            shopRepo as unknown as Pick<ShopRepository, 'findById'>,
            shopMemberRepo as unknown as Pick<
                ShopMemberRepository,
                'findByShopAndUserId'
            >,
            async (fn) => await fn(),
        );
    });

    it('should successfully record INBOUND stock movement and increment quantity', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            productId: 'prod-1',
            userId: 'user-1',
            quantityDelta: 10,
            type: 'INBOUND',
            notes: 'Shipment #42 arrived',
        });

        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-1',
            { quantity: 30 },
            undefined,
        );
        expect(stockMovementRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stockId: 'stock-1',
                type: 'INBOUND',
                quantity: 10,
                notes: 'Shipment #42 arrived',
                createdByUserId: 'user-1',
            }),
            undefined,
        );
        expect(result.stock.quantity).toBe(30);
        expect(result.movement.type).toBe('INBOUND');
    });

    it('should successfully record positive ADJUSTMENT and update stock quantity', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            productId: 'prod-1',
            userId: 'user-1',
            quantityDelta: 5,
            type: 'ADJUSTMENT',
            notes: 'Found 5 extra units in warehouse',
        });

        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-1',
            { quantity: 25 },
            undefined,
        );
        expect(result.stock.quantity).toBe(25);
        expect(result.movement.quantity).toBe(5);
    });

    it('should successfully record negative ADJUSTMENT and decrement stock quantity', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            productId: 'prod-1',
            userId: 'user-1',
            quantityDelta: -3,
            type: 'ADJUSTMENT',
            notes: 'Count was off by 3',
        });

        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-1',
            { quantity: 17 },
            undefined,
        );
        expect(result.stock.quantity).toBe(17);
        expect(result.movement.quantity).toBe(3);
    });

    it('should successfully record LOSS movement and decrement quantity', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            productId: 'prod-1',
            userId: 'user-1',
            quantityDelta: 4,
            type: 'LOSS',
            notes: 'Broken during transit',
        });

        expect(stockRepo.update).toHaveBeenCalledWith(
            'prod-1',
            { quantity: 16 },
            undefined,
        );
        expect(result.stock.quantity).toBe(16);
        expect(result.movement.quantity).toBe(4);
        expect(result.movement.type).toBe('LOSS');
    });

    it('should reject with InvalidStockAdjustmentError if adjustment would cause quantity < 0 or available < 0', async () => {
        // mockStock quantity is 20, reserved is 5 -> available is 15. Delta of -16 makes available -1 (< 0)
        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-1',
                quantityDelta: -16,
                type: 'ADJUSTMENT',
                notes: 'Too many removed',
            }),
        ).rejects.toThrow(InvalidStockAdjustmentError);
    });

    it('should reject with InvalidStockAdjustmentError if notes are missing or empty for ADJUSTMENT', async () => {
        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-1',
                quantityDelta: 2,
                type: 'ADJUSTMENT',
                notes: '   ',
            }),
        ).rejects.toThrow(InvalidStockAdjustmentError);
    });

    it('should reject with InvalidStockAdjustmentError if adjusting a bundle product', async () => {
        productRepo.findById.mockImplementation(() =>
            Promise.resolve({ ...mockProduct, is_bundle: true }),
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-1',
                quantityDelta: 5,
                type: 'ADJUSTMENT',
                notes: 'Attempting to adjust bundle',
            }),
        ).rejects.toThrow(InvalidStockAdjustmentError);
    });

    it('should reject with InvalidStockAdjustmentError if adjusting a service product', async () => {
        productRepo.findById.mockImplementation(() =>
            Promise.resolve({ ...mockProduct, type: 'service' }),
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-1',
                quantityDelta: 5,
                type: 'ADJUSTMENT',
                notes: 'Attempting to adjust service',
            }),
        ).rejects.toThrow(InvalidStockAdjustmentError);
    });

    it('should reject with ShopNotFoundError if shop does not exist', async () => {
        shopRepo.findById.mockImplementation(() => Promise.resolve(null));

        await expect(
            sut.execute({
                shopId: 'non-existent-shop',
                productId: 'prod-1',
                userId: 'user-1',
                quantityDelta: 5,
                type: 'ADJUSTMENT',
                notes: 'Adjust',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should reject with ForbiddenError if user is not a member of the shop', async () => {
        shopMemberRepo.findByShopAndUserId.mockImplementation(() =>
            Promise.resolve(null),
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-outsider',
                quantityDelta: 5,
                type: 'ADJUSTMENT',
                notes: 'Adjust',
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should reject with ProductNotFoundError if product does not exist or belongs to another shop', async () => {
        productRepo.findById.mockImplementation(() =>
            Promise.resolve({ ...mockProduct, shop_id: 'other-shop' }),
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-1',
                quantityDelta: 5,
                type: 'ADJUSTMENT',
                notes: 'Adjust',
            }),
        ).rejects.toThrow(ProductNotFoundError);
    });
});

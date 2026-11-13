import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { GetStockMovementsUseCase } from './get-stock-movements.js';
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
    ProductNotFoundError,
    StockNotFoundError,
} from '../../errors/product.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('GetStockMovementsUseCase', () => {
    let sut: GetStockMovementsUseCase;
    let productRepo: { findById: ReturnType<typeof mock> };
    let stockRepo: { findByProductId: ReturnType<typeof mock> };
    let stockMovementRepo: { findByStockId: ReturnType<typeof mock> };
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
    const mockMovements: StockMovement[] = [
        {
            id: 'mov-1',
            stockId: 'stock-1',
            type: 'INBOUND',
            quantity: 20,
            notes: 'Initial restock',
            createdByUserId: 'user-1',
            createdByUser: {
                id: 'user-1',
                name: 'Alice Admin',
                email: 'alice@example.com',
            },
            createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
            id: 'mov-2',
            stockId: 'stock-1',
            type: 'ADJUSTMENT',
            quantity: 2,
            notes: 'Correction',
            createdByUserId: 'user-1',
            createdByUser: {
                id: 'user-1',
                name: 'Alice Admin',
                email: 'alice@example.com',
            },
            createdAt: new Date('2026-01-02T10:00:00Z'),
        },
    ];

    beforeEach(() => {
        productRepo = {
            findById: mock(() => Promise.resolve(mockProduct)),
        };
        stockRepo = {
            findByProductId: mock(() => Promise.resolve(mockStock)),
        };
        stockMovementRepo = {
            findByStockId: mock(() => Promise.resolve(mockMovements)),
        };
        shopRepo = {
            findById: mock(() => Promise.resolve(mockShop)),
        };
        shopMemberRepo = {
            findByShopAndUserId: mock(() => Promise.resolve(mockMember)),
        };

        sut = new GetStockMovementsUseCase(
            productRepo as unknown as Pick<ProductRepository, 'findById'>,
            stockRepo as unknown as Pick<StockRepository, 'findByProductId'>,
            stockMovementRepo as unknown as Pick<
                StockMovementRepository,
                'findByStockId'
            >,
            shopRepo as unknown as Pick<ShopRepository, 'findById'>,
            shopMemberRepo as unknown as Pick<
                ShopMemberRepository,
                'findByShopAndUserId'
            >,
        );
    });

    it('should return chronological list of movements for a product with user attribution', async () => {
        const result = await sut.execute({
            shopId: 'shop-1',
            productId: 'prod-1',
            userId: 'user-1',
        });

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('mov-1');
        expect(result[0].createdByUser?.name).toBe('Alice Admin');
        expect(result[1].id).toBe('mov-2');
        expect(stockMovementRepo.findByStockId).toHaveBeenCalledWith('stock-1');
    });

    it('should reject with ShopNotFoundError if shop does not exist', async () => {
        shopRepo.findById.mockImplementation(() => Promise.resolve(null));

        await expect(
            sut.execute({
                shopId: 'non-existent',
                productId: 'prod-1',
                userId: 'user-1',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should reject with ForbiddenError if user is not member of shop', async () => {
        shopMemberRepo.findByShopAndUserId.mockImplementation(() =>
            Promise.resolve(null),
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'outsider',
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
            }),
        ).rejects.toThrow(ProductNotFoundError);
    });

    it('should reject with StockNotFoundError if product has no stock record', async () => {
        stockRepo.findByProductId.mockImplementation(() =>
            Promise.resolve(null),
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                productId: 'prod-1',
                userId: 'user-1',
            }),
        ).rejects.toThrow(StockNotFoundError);
    });
});

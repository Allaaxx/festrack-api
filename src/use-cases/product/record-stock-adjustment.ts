import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductNotFoundError,
    InvalidStockAdjustmentError,
} from '../../errors/product.js';
import {
    ProductRepository,
    StockRepository,
    StockMovementRepository,
    ShopRepository,
    ShopMemberRepository,
    Stock,
    StockMovement,
    StockMovementType,
} from '../../domain/index.js';
import { db } from '../../db/postgres/index.js';

export interface RecordStockAdjustmentInput {
    shopId: string;
    productId: string;
    userId: string;
    quantityDelta?: number;
    quantity_delta?: number;
    quantity?: number;
    type: 'INBOUND' | 'ADJUSTMENT' | 'LOSS';
    notes?: string | null;
    referenceId?: string | null;
    reference_id?: string | null;
}

export interface RecordStockAdjustmentOutput {
    stock: Stock;
    movement: StockMovement;
    [key: string]: any;
}

export class RecordStockAdjustmentUseCase {
    private readonly runTransaction: <T>(
        fn: (tx?: any) => Promise<T>,
    ) => Promise<T>;

    constructor(
        private readonly productRepository: Pick<ProductRepository, 'findById'>,
        private readonly stockRepository: Pick<
            StockRepository,
            'findByProductId' | 'update'
        >,
        private readonly stockMovementRepository: Pick<
            StockMovementRepository,
            'create'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        runTransaction?: <T>(fn: (tx?: any) => Promise<T>) => Promise<T>,
    ) {
        this.runTransaction =
            runTransaction ??
            (async (fn) => {
                if (typeof db?.transaction === 'function') {
                    return await db.transaction(async (tx) => await fn(tx));
                }
                return await fn();
            });
    }

    async execute(
        input: RecordStockAdjustmentInput,
    ): Promise<RecordStockAdjustmentOutput> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const member = await this.shopMemberRepository.findByShopAndUserId(
            input.shopId,
            input.userId,
        );
        if (!member) {
            throw new ForbiddenError();
        }

        const product = await this.productRepository.findById(input.productId);
        if (!product || product.shop_id !== input.shopId) {
            throw new ProductNotFoundError(input.productId);
        }

        if (product.is_bundle || product.type === 'service') {
            throw new InvalidStockAdjustmentError(
                'Cannot adjust stock for service or bundle products.',
            );
        }

        const isAdjustmentOrLoss =
            input.type === 'ADJUSTMENT' || input.type === 'LOSS';
        if (isAdjustmentOrLoss && (!input.notes || input.notes.trim() === '')) {
            throw new InvalidStockAdjustmentError(
                'Notes are required for stock adjustments and losses.',
            );
        }

        const rawDelta =
            input.quantityDelta ?? input.quantity_delta ?? input.quantity;
        if (
            rawDelta === undefined ||
            typeof rawDelta !== 'number' ||
            isNaN(rawDelta) ||
            !Number.isInteger(rawDelta)
        ) {
            throw new InvalidStockAdjustmentError(
                'Quantity delta must be an integer.',
            );
        }

        if (rawDelta === 0) {
            throw new InvalidStockAdjustmentError(
                'Quantity delta cannot be zero.',
            );
        }

        return await this.runTransaction(async (tx) => {
            const currentStock = await this.stockRepository.findByProductId(
                input.productId,
                tx,
            );
            if (!currentStock) {
                throw new InvalidStockAdjustmentError(
                    'Product has no stock record.',
                );
            }

            let newQuantity: number;
            let movementQuantity: number;

            if (input.type === 'INBOUND') {
                const absDelta = Math.abs(rawDelta);
                newQuantity = currentStock.quantity + absDelta;
                movementQuantity = absDelta;
            } else if (input.type === 'LOSS') {
                const absDelta = Math.abs(rawDelta);
                newQuantity = currentStock.quantity - absDelta;
                movementQuantity = absDelta;
            } else if (input.type === 'ADJUSTMENT') {
                newQuantity = currentStock.quantity + rawDelta;
                movementQuantity = Math.abs(rawDelta);
            } else {
                throw new InvalidStockAdjustmentError(
                    `Invalid movement type: ${input.type}`,
                );
            }

            const newAvailable = newQuantity - currentStock.reserved;
            if (newQuantity < 0 || newAvailable < 0) {
                throw new InvalidStockAdjustmentError(
                    'Stock adjustment would cause quantity or available stock to become negative (below zero).',
                );
            }

            const updatedStock = await this.stockRepository.update(
                input.productId,
                {
                    quantity: newQuantity,
                },
                tx,
            );

            const movement = await this.stockMovementRepository.create(
                {
                    stockId: currentStock.id,
                    type: input.type as StockMovementType,
                    quantity: movementQuantity,
                    notes: input.notes?.trim() || null,
                    referenceId:
                        input.referenceId ?? input.reference_id ?? null,
                    createdByUserId: input.userId,
                },
                tx,
            );

            return {
                ...updatedStock,
                stock: updatedStock,
                movement,
            };
        });
    }
}

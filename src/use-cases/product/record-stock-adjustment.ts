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
    TransactionManager,
} from '../../domain/index.js';
import { DrizzleTransactionManager } from '../../repositories/postgres/transaction-manager.js';

export interface RecordStockAdjustmentInput {
    shopId: string;
    productId: string;
    userId: string;
    quantityDelta?: number;
    quantity_delta?: number;
    type: StockMovementType;
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
    private readonly transactionManager: TransactionManager;

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
        transactionManager?:
            | TransactionManager
            | (<T>(fn: (tx?: any) => Promise<T>) => Promise<T>),
    ) {
        if (typeof transactionManager === 'function') {
            const txRunner = transactionManager as any;
            this.transactionManager = {
                run: async <T>(fn: () => Promise<T>): Promise<T> =>
                    await txRunner(async (_tx: any) => await fn()),
            };
        } else if (
            transactionManager &&
            typeof transactionManager.run === 'function'
        ) {
            this.transactionManager = transactionManager;
        } else {
            this.transactionManager = new DrizzleTransactionManager();
        }
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

        const allowedTypes: StockMovementType[] = [
            'INBOUND',
            'LOSS',
            'ADJUSTMENT',
        ];
        if (!allowedTypes.includes(input.type)) {
            throw new InvalidStockAdjustmentError(
                `Manual adjustment movement type must be one of: ${allowedTypes.join(', ')}`,
            );
        }

        const isAdjustmentOrLoss =
            input.type === 'ADJUSTMENT' || input.type === 'LOSS';
        if (isAdjustmentOrLoss && (!input.notes || input.notes.trim() === '')) {
            throw new InvalidStockAdjustmentError(
                'Notes are required for stock adjustments and losses.',
            );
        }

        const rawDelta = input.quantityDelta ?? input.quantity_delta;
        if (
            rawDelta === undefined ||
            rawDelta === null ||
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

        return await this.transactionManager.run(async () => {
            const currentStock = await this.stockRepository.findByProductId(
                input.productId,
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
            );

            const movement = await this.stockMovementRepository.create({
                stockId: currentStock.id,
                type: input.type,
                quantity: movementQuantity,
                notes: input.notes?.trim() || null,
                referenceId: input.referenceId ?? input.reference_id ?? null,
                createdByUserId: input.userId,
            });

            return {
                ...updatedStock,
                stock: updatedStock,
                movement,
            };
        });
    }
}

import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductNotFoundError,
    InsufficientStockError,
    InsufficientStockDetail,
    InvalidStockAdjustmentError,
} from '../../errors/product.js';
import {
    ProductRepository,
    StockRepository,
    StockMovementRepository,
    ShopRepository,
    ShopMemberRepository,
    BundleItemRepository,
    StockMovement,
    TransactionManager,
} from '../../domain/index.js';
import { DrizzleTransactionManager } from '../../repositories/postgres/transaction-manager.js';

export interface ReserveStockItemInput {
    productId?: string;
    product_id?: string;
    quantity: number;
    type?: 'sale' | 'rent';
}

export interface ReserveStockInput {
    shopId: string;
    userId: string;
    referenceId?: string | null;
    reference_id?: string | null;
    notes?: string | null;
    items: ReserveStockItemInput[];
}

export interface ReservedComponentSummary {
    productId: string;
    product_id: string;
    productName?: string;
    product_name?: string;
    quantity: number;
    reservedQuantity: number;
    reserved_quantity: number;
    stockId: string;
    stock_id: string;
    movementId: string;
    movement_id: string;
}

export interface ReserveStockOutput {
    success: boolean;
    referenceId?: string | null;
    reference_id?: string | null;
    items: ReservedComponentSummary[];
    movements: StockMovement[];
    movementIds: string[];
    movement_ids: string[];
}

interface ComponentAccumulator {
    productId: string;
    productName?: string;
    saleQuantity: number;
    rentQuantity: number;
}

export class ReserveStockUseCase {
    private readonly transactionManager: TransactionManager;

    constructor(
        private readonly productRepository: Pick<ProductRepository, 'findById'>,
        private readonly stockRepository: Pick<
            StockRepository,
            'findByProductId' | 'update' | 'findManyByProductIdsWithLock'
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
        private readonly bundleItemRepository: Pick<
            BundleItemRepository,
            'findByBundleId'
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

    async execute(input: ReserveStockInput): Promise<ReserveStockOutput> {
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

        if (!input.items || input.items.length === 0) {
            return {
                success: true,
                referenceId: input.referenceId ?? input.reference_id ?? null,
                reference_id: input.referenceId ?? input.reference_id ?? null,
                items: [],
                movements: [],
                movementIds: [],
                movement_ids: [],
            };
        }

        const componentMap = new Map<string, ComponentAccumulator>();

        for (const item of input.items) {
            const productId = item.productId || item.product_id;
            if (!productId) {
                throw new InvalidStockAdjustmentError(
                    'Item product_id is required.',
                );
            }

            if (
                item.quantity === undefined ||
                item.quantity === null ||
                typeof item.quantity !== 'number' ||
                isNaN(item.quantity) ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1
            ) {
                throw new InvalidStockAdjustmentError(
                    'Item quantity must be an integer >= 1.',
                );
            }

            const product = await this.productRepository.findById(productId);
            if (!product || product.shop_id !== input.shopId) {
                throw new ProductNotFoundError(productId);
            }

            if (product.type === 'service') {
                continue;
            }

            const itemType =
                item.type ?? (product.type === 'rent' ? 'rent' : 'sale');

            if (product.is_bundle) {
                const bundleComponents =
                    await this.bundleItemRepository.findByBundleId(product.id);

                if (!bundleComponents || bundleComponents.length === 0) {
                    throw new InsufficientStockError({
                        productId: product.id,
                        productName: product.name,
                        requestedQuantity: item.quantity,
                        availableStock: 0,
                    });
                }

                for (const bComp of bundleComponents) {
                    const compType =
                        bComp.componentProduct?.type ??
                        bComp.product?.type ??
                        (bComp as any).type;
                    if (compType === 'service') {
                        continue;
                    }

                    const compId = bComp.productId || bComp.product_id;
                    const compQty = bComp.quantity * item.quantity;
                    const compName =
                        bComp.componentProduct?.name ??
                        bComp.product?.name ??
                        undefined;

                    const existing = componentMap.get(compId);
                    const saleQty = itemType === 'sale' ? compQty : 0;
                    const rentQty = itemType === 'rent' ? compQty : 0;

                    if (existing) {
                        existing.saleQuantity += saleQty;
                        existing.rentQuantity += rentQty;
                    } else {
                        componentMap.set(compId, {
                            productId: compId,
                            productName: compName,
                            saleQuantity: saleQty,
                            rentQuantity: rentQty,
                        });
                    }
                }
            } else {
                const existing = componentMap.get(product.id);
                const saleQty = itemType === 'sale' ? item.quantity : 0;
                const rentQty = itemType === 'rent' ? item.quantity : 0;

                if (existing) {
                    existing.saleQuantity += saleQty;
                    existing.rentQuantity += rentQty;
                } else {
                    componentMap.set(product.id, {
                        productId: product.id,
                        productName: product.name,
                        saleQuantity: saleQty,
                        rentQuantity: rentQty,
                    });
                }
            }
        }

        if (componentMap.size === 0) {
            return {
                success: true,
                referenceId: input.referenceId ?? input.reference_id ?? null,
                reference_id: input.referenceId ?? input.reference_id ?? null,
                items: [],
                movements: [],
                movementIds: [],
                movement_ids: [],
            };
        }

        const sortedProductIds = Array.from(componentMap.keys()).sort();

        return await this.transactionManager.run(async () => {
            const lockedStocks =
                await this.stockRepository.findManyByProductIdsWithLock(
                    sortedProductIds,
                );

            const stockMap = new Map(
                lockedStocks.map((s) => [s.product_id, s]),
            );

            const insufficientDetails: InsufficientStockDetail[] = [];

            for (const productId of sortedProductIds) {
                const component = componentMap.get(productId)!;
                const totalRequested =
                    component.saleQuantity + component.rentQuantity;
                const stockRecord = stockMap.get(productId);
                const available = stockRecord
                    ? stockRecord.quantity - stockRecord.reserved
                    : 0;

                if (!stockRecord || available < totalRequested) {
                    insufficientDetails.push({
                        productId,
                        product_id: productId,
                        productName: component.productName,
                        product_name: component.productName,
                        requestedQuantity: totalRequested,
                        requested_quantity: totalRequested,
                        availableStock: Math.max(0, available),
                        available_stock: Math.max(0, available),
                    });
                }
            }

            if (insufficientDetails.length > 0) {
                throw new InsufficientStockError(insufficientDetails);
            }

            const reservedItems: ReservedComponentSummary[] = [];
            const createdMovements: StockMovement[] = [];

            for (const productId of sortedProductIds) {
                const component = componentMap.get(productId)!;
                const stockRecord = stockMap.get(productId)!;

                const newQuantity =
                    stockRecord.quantity - component.saleQuantity;
                const newReserved =
                    stockRecord.reserved + component.rentQuantity;

                const updatedStock = await this.stockRepository.update(
                    productId,
                    {
                        quantity: newQuantity,
                        reserved: newReserved,
                    },
                );

                if (component.saleQuantity > 0) {
                    const saleMovement =
                        await this.stockMovementRepository.create({
                            stockId: stockRecord.id,
                            type: 'SALE',
                            quantity: component.saleQuantity,
                            referenceId:
                                input.referenceId ?? input.reference_id ?? null,
                            notes: input.notes ?? null,
                            createdByUserId: input.userId,
                        });

                    createdMovements.push(saleMovement);
                    reservedItems.push({
                        productId,
                        product_id: productId,
                        productName: component.productName,
                        product_name: component.productName,
                        quantity: component.saleQuantity,
                        reservedQuantity: updatedStock.reserved,
                        reserved_quantity: updatedStock.reserved,
                        stockId: stockRecord.id,
                        stock_id: stockRecord.id,
                        movementId: saleMovement.id,
                        movement_id: saleMovement.id,
                    });
                }

                if (component.rentQuantity > 0) {
                    const rentMovement =
                        await this.stockMovementRepository.create({
                            stockId: stockRecord.id,
                            type: 'RENTAL_ALLOCATION',
                            quantity: component.rentQuantity,
                            referenceId:
                                input.referenceId ?? input.reference_id ?? null,
                            notes: input.notes ?? null,
                            createdByUserId: input.userId,
                        });

                    createdMovements.push(rentMovement);
                    reservedItems.push({
                        productId,
                        product_id: productId,
                        productName: component.productName,
                        product_name: component.productName,
                        quantity: component.rentQuantity,
                        reservedQuantity: updatedStock.reserved,
                        reserved_quantity: updatedStock.reserved,
                        stockId: stockRecord.id,
                        stock_id: stockRecord.id,
                        movementId: rentMovement.id,
                        movement_id: rentMovement.id,
                    });
                }
            }

            return {
                success: true,
                referenceId: input.referenceId ?? input.reference_id ?? null,
                reference_id: input.referenceId ?? input.reference_id ?? null,
                items: reservedItems,
                movements: createdMovements,
                movementIds: createdMovements.map((m) => m.id),
                movement_ids: createdMovements.map((m) => m.id),
            };
        });
    }
}

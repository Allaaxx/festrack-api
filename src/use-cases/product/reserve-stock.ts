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
    StockMovementType,
} from '../../domain/index.js';
import { db } from '../../db/postgres/index.js';

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
    totalQuantity: number;
    type: 'sale' | 'rent';
}

export class ReserveStockUseCase {
    private readonly runTransaction: <T>(
        fn: (tx?: any) => Promise<T>,
    ) => Promise<T>;

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
                    const compId = bComp.productId || bComp.product_id;
                    const compQty = bComp.quantity * item.quantity;
                    const compName =
                        bComp.componentProduct?.name ??
                        bComp.product?.name ??
                        undefined;

                    const existing = componentMap.get(compId);
                    if (existing) {
                        existing.totalQuantity += compQty;
                        if (itemType === 'rent') {
                            existing.type = 'rent';
                        }
                    } else {
                        componentMap.set(compId, {
                            productId: compId,
                            productName: compName,
                            totalQuantity: compQty,
                            type: itemType,
                        });
                    }
                }
            } else {
                const existing = componentMap.get(product.id);
                if (existing) {
                    existing.totalQuantity += item.quantity;
                    if (itemType === 'rent') {
                        existing.type = 'rent';
                    }
                } else {
                    componentMap.set(product.id, {
                        productId: product.id,
                        productName: product.name,
                        totalQuantity: item.quantity,
                        type: itemType,
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

        return await this.runTransaction(async (tx) => {
            const lockedStocks =
                await this.stockRepository.findManyByProductIdsWithLock(
                    sortedProductIds,
                    tx,
                );

            const stockMap = new Map(
                lockedStocks.map((s) => [s.product_id, s]),
            );

            const insufficientDetails: InsufficientStockDetail[] = [];

            for (const productId of sortedProductIds) {
                const component = componentMap.get(productId)!;
                const stockRecord = stockMap.get(productId);
                const available = stockRecord
                    ? stockRecord.quantity - stockRecord.reserved
                    : 0;

                if (!stockRecord || available < component.totalQuantity) {
                    insufficientDetails.push({
                        productId,
                        product_id: productId,
                        productName: component.productName,
                        product_name: component.productName,
                        requestedQuantity: component.totalQuantity,
                        requested_quantity: component.totalQuantity,
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

                const newReserved =
                    stockRecord.reserved + component.totalQuantity;
                const updatedStock = await this.stockRepository.update(
                    productId,
                    {
                        reserved: newReserved,
                    },
                    tx,
                );

                const movementType: StockMovementType =
                    component.type === 'rent' ? 'RENTAL_ALLOCATION' : 'SALE';

                const movement = await this.stockMovementRepository.create(
                    {
                        stockId: stockRecord.id,
                        type: movementType,
                        quantity: component.totalQuantity,
                        referenceId:
                            input.referenceId ?? input.reference_id ?? null,
                        notes: input.notes ?? null,
                        createdByUserId: input.userId,
                    },
                    tx,
                );

                createdMovements.push(movement);
                reservedItems.push({
                    productId,
                    product_id: productId,
                    productName: component.productName,
                    product_name: component.productName,
                    quantity: component.totalQuantity,
                    reservedQuantity: updatedStock.reserved,
                    reserved_quantity: updatedStock.reserved,
                    stockId: stockRecord.id,
                    stock_id: stockRecord.id,
                    movementId: movement.id,
                    movement_id: movement.id,
                });
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

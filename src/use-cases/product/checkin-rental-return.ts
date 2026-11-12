import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductNotFoundError,
    StockNotFoundError,
    InvalidRentalReturnError,
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

export interface CheckinRentalReturnItemInput {
    productId?: string;
    product_id?: string;
    returnedQuantity?: number;
    returned_quantity?: number;
    damagedQuantity?: number;
    damaged_quantity?: number;
    notes?: string | null;
}

export interface CheckinRentalReturnInput {
    shopId: string;
    userId: string;
    referenceId?: string | null;
    reference_id?: string | null;
    notes?: string | null;
    items: CheckinRentalReturnItemInput[];
}

export interface CheckinComponentSummary {
    productId: string;
    product_id: string;
    productName?: string;
    product_name?: string;
    returnedQuantity: number;
    returned_quantity: number;
    damagedQuantity: number;
    damaged_quantity: number;
    stockId: string;
    stock_id: string;
    currentQuantity: number;
    current_quantity: number;
    currentReserved: number;
    current_reserved: number;
}

export interface CheckinRentalReturnOutput {
    success: boolean;
    referenceId?: string | null;
    reference_id?: string | null;
    items: CheckinComponentSummary[];
    movements: StockMovement[];
    movementIds: string[];
    movement_ids: string[];
}

interface ComponentCheckinAccumulator {
    productId: string;
    productName?: string;
    returnedQuantity: number;
    damagedQuantity: number;
    notes?: string | null;
}

export class CheckinRentalReturnUseCase {
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

    async execute(
        input: CheckinRentalReturnInput,
    ): Promise<CheckinRentalReturnOutput> {
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

        const componentMap = new Map<string, ComponentCheckinAccumulator>();

        for (const item of input.items) {
            const productId = item.productId || item.product_id;
            if (!productId) {
                throw new InvalidRentalReturnError(
                    'Item product_id is required.',
                );
            }

            const returnedQty =
                item.returnedQuantity ?? item.returned_quantity ?? 0;
            const damagedQty =
                item.damagedQuantity ?? item.damaged_quantity ?? 0;

            if (
                typeof returnedQty !== 'number' ||
                isNaN(returnedQty) ||
                !Number.isInteger(returnedQty) ||
                returnedQty < 0
            ) {
                throw new InvalidRentalReturnError(
                    'Item returned_quantity must be an integer >= 0.',
                );
            }

            if (
                typeof damagedQty !== 'number' ||
                isNaN(damagedQty) ||
                !Number.isInteger(damagedQty) ||
                damagedQty < 0
            ) {
                throw new InvalidRentalReturnError(
                    'Item damaged_quantity must be an integer >= 0.',
                );
            }

            if (returnedQty === 0 && damagedQty === 0) {
                throw new InvalidRentalReturnError(
                    'At least one of returned_quantity or damaged_quantity must be greater than 0.',
                );
            }

            const damageNotes = item.notes?.trim() || input.notes?.trim();
            if (damagedQty > 0 && !damageNotes) {
                throw new InvalidRentalReturnError(
                    'Damage notes are required when damaged quantity is greater than 0.',
                );
            }

            const product = await this.productRepository.findById(productId);
            if (!product || product.shop_id !== input.shopId) {
                throw new ProductNotFoundError(productId);
            }

            if (product.type === 'service') {
                continue;
            }

            const itemNotes = item.notes ?? input.notes ?? null;

            if (product.is_bundle) {
                const bundleComponents =
                    await this.bundleItemRepository.findByBundleId(product.id);

                if (!bundleComponents || bundleComponents.length === 0) {
                    throw new InvalidRentalReturnError(
                        `Bundle '${product.name}' contains no components.`,
                    );
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
                    const compReturned = bComp.quantity * returnedQty;
                    const compDamaged = bComp.quantity * damagedQty;
                    const compName =
                        bComp.componentProduct?.name ??
                        bComp.product?.name ??
                        undefined;

                    const existing = componentMap.get(compId);
                    if (existing) {
                        existing.returnedQuantity += compReturned;
                        existing.damagedQuantity += compDamaged;
                        if (itemNotes) {
                            existing.notes = existing.notes
                                ? `${existing.notes}; ${itemNotes}`
                                : itemNotes;
                        }
                    } else {
                        componentMap.set(compId, {
                            productId: compId,
                            productName: compName,
                            returnedQuantity: compReturned,
                            damagedQuantity: compDamaged,
                            notes: itemNotes,
                        });
                    }
                }
            } else {
                const existing = componentMap.get(product.id);
                if (existing) {
                    existing.returnedQuantity += returnedQty;
                    existing.damagedQuantity += damagedQty;
                    if (itemNotes) {
                        existing.notes = existing.notes
                            ? `${existing.notes}; ${itemNotes}`
                            : itemNotes;
                    }
                } else {
                    componentMap.set(product.id, {
                        productId: product.id,
                        productName: product.name,
                        returnedQuantity: returnedQty,
                        damagedQuantity: damagedQty,
                        notes: itemNotes,
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

            // Validation pass: ensure total returned + damaged <= reserved stock
            for (const productId of sortedProductIds) {
                const comp = componentMap.get(productId)!;
                const stockRecord = stockMap.get(productId);

                if (!stockRecord) {
                    throw new StockNotFoundError(productId);
                }

                const totalToCheckin =
                    comp.returnedQuantity + comp.damagedQuantity;

                if (stockRecord.reserved < totalToCheckin) {
                    throw new InvalidRentalReturnError(
                        `Returned and lost quantity (${totalToCheckin}) exceeds reserved stock (${stockRecord.reserved}) for product '${comp.productName || productId}'.`,
                        [
                            {
                                productId,
                                product_id: productId,
                                productName: comp.productName,
                                product_name: comp.productName,
                                returnedQuantity: comp.returnedQuantity,
                                returned_quantity: comp.returnedQuantity,
                                damagedQuantity: comp.damagedQuantity,
                                damaged_quantity: comp.damagedQuantity,
                                totalToCheckin,
                                total_to_checkin: totalToCheckin,
                                reservedStock: stockRecord.reserved,
                                reserved_stock: stockRecord.reserved,
                                reason: 'Returned and lost quantity exceeds reserved stock.',
                            },
                        ],
                    );
                }
            }

            // Execution pass: update stocks and record movements
            const checkinSummaries: CheckinComponentSummary[] = [];
            const createdMovements: StockMovement[] = [];

            for (const productId of sortedProductIds) {
                const comp = componentMap.get(productId)!;
                const stockRecord = stockMap.get(productId)!;
                const totalToCheckin =
                    comp.returnedQuantity + comp.damagedQuantity;

                const newReserved = stockRecord.reserved - totalToCheckin;
                const newQuantity = stockRecord.quantity - comp.damagedQuantity;

                const updatedStock = await this.stockRepository.update(
                    productId,
                    {
                        quantity: newQuantity,
                        reserved: newReserved,
                    },
                );

                if (comp.returnedQuantity > 0) {
                    const returnMovement =
                        await this.stockMovementRepository.create({
                            stockId: stockRecord.id,
                            type: 'RENTAL_RETURN',
                            quantity: comp.returnedQuantity,
                            referenceId:
                                input.referenceId ?? input.reference_id ?? null,
                            notes:
                                comp.notes ||
                                input.notes ||
                                'Rental return check-in',
                            createdByUserId: input.userId,
                        });
                    createdMovements.push(returnMovement);
                }

                if (comp.damagedQuantity > 0) {
                    const lossMovement =
                        await this.stockMovementRepository.create({
                            stockId: stockRecord.id,
                            type: 'LOSS',
                            quantity: comp.damagedQuantity,
                            referenceId:
                                input.referenceId ?? input.reference_id ?? null,
                            notes:
                                comp.notes ||
                                input.notes ||
                                'Rental loss/damage',
                            createdByUserId: input.userId,
                        });
                    createdMovements.push(lossMovement);
                }

                checkinSummaries.push({
                    productId,
                    product_id: productId,
                    productName: comp.productName,
                    product_name: comp.productName,
                    returnedQuantity: comp.returnedQuantity,
                    returned_quantity: comp.returnedQuantity,
                    damagedQuantity: comp.damagedQuantity,
                    damaged_quantity: comp.damagedQuantity,
                    stockId: stockRecord.id,
                    stock_id: stockRecord.id,
                    currentQuantity: updatedStock.quantity,
                    current_quantity: updatedStock.quantity,
                    currentReserved: updatedStock.reserved,
                    current_reserved: updatedStock.reserved,
                });
            }

            return {
                success: true,
                referenceId: input.referenceId ?? input.reference_id ?? null,
                reference_id: input.referenceId ?? input.reference_id ?? null,
                items: checkinSummaries,
                movements: createdMovements,
                movementIds: createdMovements.map((m) => m.id),
                movement_ids: createdMovements.map((m) => m.id),
            };
        });
    }
}

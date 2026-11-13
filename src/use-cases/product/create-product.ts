import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    SlugAlreadyExistsError,
    InvalidBundleComponentError,
} from '../../errors/product.js';
import {
    ProductWithStock,
    ProductRepository,
    StockRepository,
    StockMovementRepository,
    ShopRepository,
    ShopMemberRepository,
    BundleItemRepository,
    BundleItem,
    ProductType,
    TransactionManager,
} from '../../domain/index.js';
import { DrizzleTransactionManager } from '../../repositories/postgres/transaction-manager.js';

export interface CreateProductInput {
    shopId: string;
    userId: string;
    name: string;
    slug: string;
    type: ProductType;
    price: number | string;
    description?: string | null;
    images?: string[];
    quantity?: number;
    initial_quantity?: number;
    is_bundle?: boolean;
    isBundle?: boolean;
    bundle_items?: Array<{
        product_id?: string;
        productId?: string;
        quantity: number;
    }>;
    bundleItems?: Array<{
        product_id?: string;
        productId?: string;
        quantity: number;
    }>;
}

export class CreateProductUseCase {
    private readonly transactionManager: TransactionManager;
    private readonly stockMovementRepository?: Pick<
        StockMovementRepository,
        'create'
    >;

    constructor(
        private readonly productRepository: Pick<
            ProductRepository,
            'create' | 'findBySlug'
        > &
            Partial<Pick<ProductRepository, 'findById'>>,
        private readonly stockRepository: Pick<StockRepository, 'create'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly bundleItemRepository?: Pick<
            BundleItemRepository,
            'createMany'
        >,
        stockMovementRepository?:
            | Pick<StockMovementRepository, 'create'>
            | TransactionManager
            | (<T>(fn: (tx?: any) => Promise<T>) => Promise<T>),
        transactionManager?:
            | TransactionManager
            | (<T>(fn: (tx?: any) => Promise<T>) => Promise<T>),
    ) {
        if (
            typeof stockMovementRepository === 'function' ||
            (stockMovementRepository && 'run' in stockMovementRepository)
        ) {
            const txRunner = stockMovementRepository as any;
            if (typeof txRunner === 'function') {
                this.transactionManager = {
                    run: async <T>(fn: () => Promise<T>): Promise<T> =>
                        await txRunner(async (_tx: any) => await fn()),
                };
            } else {
                this.transactionManager = txRunner;
            }
            this.stockMovementRepository = undefined;
        } else {
            this.stockMovementRepository = stockMovementRepository;
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
    }

    async execute(input: CreateProductInput): Promise<ProductWithStock> {
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

        const existing = await this.productRepository.findBySlug(
            input.shopId,
            input.slug,
        );
        if (existing) {
            throw new SlugAlreadyExistsError(input.slug);
        }

        const isBundle = Boolean(input.isBundle ?? input.is_bundle);

        if (isBundle) {
            const rawBundleItems = input.bundleItems ?? input.bundle_items;
            if (
                !rawBundleItems ||
                !Array.isArray(rawBundleItems) ||
                rawBundleItems.length === 0
            ) {
                throw new InvalidBundleComponentError(
                    'A bundle product must contain at least one component product.',
                );
            }

            const bundleItemsToCreate: Array<{
                product_id: string;
                productId: string;
                quantity: number;
            }> = [];

            for (const item of rawBundleItems) {
                const compId = item.productId ?? item.product_id;
                if (!compId) {
                    throw new InvalidBundleComponentError(
                        'Component product ID is required.',
                    );
                }

                const component = this.productRepository.findById
                    ? await this.productRepository.findById(compId)
                    : null;
                if (!component) {
                    throw new InvalidBundleComponentError(
                        `Component product with id '${compId}' not found.`,
                    );
                }

                if (component.shop_id !== input.shopId) {
                    throw new InvalidBundleComponentError(
                        `Component product '${component.name}' belongs to another shop.`,
                    );
                }

                if (component.is_bundle) {
                    throw new InvalidBundleComponentError(
                        `Component product '${component.name}' cannot be a bundle (nesting bundles is not allowed).`,
                    );
                }

                bundleItemsToCreate.push({
                    product_id: compId,
                    productId: compId,
                    quantity: item.quantity,
                });
            }

            return await this.transactionManager.run(async () => {
                const product = await this.productRepository.create({
                    shop_id: input.shopId,
                    name: input.name,
                    slug: input.slug,
                    type: input.type,
                    price: input.price,
                    description: input.description ?? null,
                    images: input.images ?? [],
                    is_bundle: true,
                });

                let createdItems: BundleItem[] = [];
                if (this.bundleItemRepository) {
                    createdItems = await this.bundleItemRepository.createMany(
                        bundleItemsToCreate.map((i) => ({
                            bundle_product_id: product.id,
                            product_id: i.product_id,
                            quantity: i.quantity,
                        })),
                    );
                }

                return {
                    ...product,
                    stock: null,
                    bundle_items: createdItems,
                    bundleItems: createdItems,
                };
            });
        }

        if (input.type === 'service') {
            const product = await this.productRepository.create({
                shop_id: input.shopId,
                name: input.name,
                slug: input.slug,
                type: input.type,
                price: input.price,
                description: input.description ?? null,
                images: input.images ?? [],
                is_bundle: false,
            });

            return {
                ...product,
                stock: null,
            };
        }

        return await this.transactionManager.run(async () => {
            const product = await this.productRepository.create({
                shop_id: input.shopId,
                name: input.name,
                slug: input.slug,
                type: input.type,
                price: input.price,
                description: input.description ?? null,
                images: input.images ?? [],
                is_bundle: false,
            });

            const initialQuantity =
                input.initial_quantity ?? input.quantity ?? 0;
            const createdStock = await this.stockRepository.create({
                product_id: product.id,
                quantity: initialQuantity,
                reserved: 0,
            });

            if (initialQuantity > 0 && this.stockMovementRepository) {
                await this.stockMovementRepository.create({
                    stockId: createdStock.id,
                    type: 'INBOUND',
                    quantity: initialQuantity,
                    notes: 'Initial stock entry',
                    createdByUserId: input.userId,
                });
            }

            return {
                ...product,
                stock: createdStock,
            };
        });
    }
}

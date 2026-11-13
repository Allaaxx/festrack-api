import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductWithStock,
    ProductRepository,
    ShopRepository,
    ShopMemberRepository,
    BundleItemRepository,
    ProductType,
    BundleItem,
    calculateBundleAvailableStock,
} from '../../domain/index.js';

export class ListProductsUseCase {
    constructor(
        private readonly productRepository: Pick<
            ProductRepository,
            'findByShopId'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly bundleItemRepository?: Pick<
            BundleItemRepository,
            'findByBundleId' | 'findByBundleIds'
        >,
    ) {}

    async execute(
        shopId: string,
        userId: string,
        type?: ProductType,
    ): Promise<ProductWithStock[]> {
        const shop = await this.shopRepository.findById(shopId);
        if (!shop) {
            throw new ShopNotFoundError(shopId);
        }

        const member = await this.shopMemberRepository.findByShopAndUserId(
            shopId,
            userId,
        );
        if (!member) {
            throw new ForbiddenError();
        }

        const products = await this.productRepository.findByShopId(
            shopId,
            type ? { type } : undefined,
        );

        const bundleProducts = products.filter((p) => p.is_bundle);
        const bundleItemsMap = new Map<string, BundleItem[]>();

        if (bundleProducts.length > 0 && this.bundleItemRepository) {
            const bundleIds = bundleProducts.map((p) => p.id);
            if (
                typeof this.bundleItemRepository.findByBundleIds === 'function'
            ) {
                const items =
                    await this.bundleItemRepository.findByBundleIds(bundleIds);
                for (const item of items) {
                    const bundleId =
                        item.bundle_product_id ?? item.bundleProductId;
                    const list = bundleItemsMap.get(bundleId) ?? [];
                    list.push(item);
                    bundleItemsMap.set(bundleId, list);
                }
            } else {
                await Promise.all(
                    bundleIds.map(async (bundleId) => {
                        const items =
                            await this.bundleItemRepository!.findByBundleId(
                                bundleId,
                            );
                        bundleItemsMap.set(bundleId, items);
                    }),
                );
            }
        }

        return products.map((product) => {
            if (product.is_bundle) {
                const items = bundleItemsMap.get(product.id) ?? [];
                const availableStock = calculateBundleAvailableStock(items);

                return {
                    ...product,
                    available_stock: availableStock,
                    availableStock,
                    stock: {
                        id: '',
                        product_id: product.id,
                        quantity: availableStock,
                        reserved: 0,
                        available_stock: availableStock,
                        availableStock,
                        updated_at: product.updated_at,
                    },
                };
            }

            if (product.type === 'service') {
                return {
                    ...product,
                    stock: null,
                };
            }

            const available = product.stock
                ? product.stock.quantity - product.stock.reserved
                : 0;

            return {
                ...product,
                available_stock: available,
                availableStock: available,
                stock: product.stock
                    ? {
                          ...product.stock,
                          available_stock: available,
                          availableStock: available,
                      }
                    : null,
            };
        });
    }
}

import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { ProductNotFoundError } from '../../errors/product.js';
import {
    ProductWithStock,
    ProductRepository,
    ShopRepository,
    ShopMemberRepository,
    BundleItemRepository,
    calculateBundleAvailableStock,
} from '../../domain/index.js';

export class GetProductUseCase {
    constructor(
        private readonly productRepository: Pick<
            ProductRepository,
            'findByIdWithStock'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly bundleItemRepository?: Pick<
            BundleItemRepository,
            'findByBundleId'
        >,
    ) {}

    async execute(
        shopId: string,
        productId: string,
        userId: string,
    ): Promise<ProductWithStock> {
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

        const product =
            await this.productRepository.findByIdWithStock(productId);
        if (!product || product.shop_id !== shopId) {
            throw new ProductNotFoundError(productId);
        }

        if (product.is_bundle) {
            const bundleItems = this.bundleItemRepository
                ? await this.bundleItemRepository.findByBundleId(productId)
                : [];
            const availableStock = calculateBundleAvailableStock(bundleItems);

            return {
                ...product,
                stock: null,
                available_stock: availableStock,
                availableStock,
                bundle_items: bundleItems,
                bundleItems,
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
    }
}

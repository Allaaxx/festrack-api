import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { ProductNotFoundError } from '../../errors/product.js';
import {
    ProductWithStock,
    ProductRepository,
    ShopRepository,
    ShopMemberRepository,
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

        return product;
    }
}

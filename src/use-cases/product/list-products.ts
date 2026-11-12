import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductWithStock,
    ProductRepository,
    ShopRepository,
    ShopMemberRepository,
    ProductType,
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

        return await this.productRepository.findByShopId(
            shopId,
            type ? { type } : undefined,
        );
    }
}

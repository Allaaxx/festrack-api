import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ProductNotFoundError,
    StockNotFoundError,
} from '../../errors/product.js';
import {
    ProductRepository,
    StockRepository,
    StockMovementRepository,
    ShopRepository,
    ShopMemberRepository,
    StockMovement,
} from '../../domain/index.js';

export interface GetStockMovementsInput {
    shopId: string;
    productId: string;
    userId: string;
}

export class GetStockMovementsUseCase {
    constructor(
        private readonly productRepository: Pick<ProductRepository, 'findById'>,
        private readonly stockRepository: Pick<
            StockRepository,
            'findByProductId'
        >,
        private readonly stockMovementRepository: Pick<
            StockMovementRepository,
            'findByStockId'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(input: GetStockMovementsInput): Promise<StockMovement[]> {
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

        const stock = await this.stockRepository.findByProductId(
            input.productId,
        );
        if (!stock) {
            throw new StockNotFoundError(input.productId);
        }

        return await this.stockMovementRepository.findByStockId(stock.id);
    }
}

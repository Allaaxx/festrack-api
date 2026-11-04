import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    ShopMemberRepository,
    ShopRepository,
    Transaction,
    TransactionRepository,
} from '../../domain/index.js';

export class GetTransactionByIdUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'findById'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(
        shopId: string,
        transactionId: string,
        userId: string,
    ): Promise<Transaction> {
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

        const tx = await this.transactionRepository.findById(transactionId);
        if (!tx || tx.shop_id !== shopId) {
            throw new TransactionNotFoundError(transactionId);
        }

        return tx;
    }
}

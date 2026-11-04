import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { EventNotFoundError } from '../../errors/event.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    EventRepository,
    ShopMemberRepository,
    ShopRepository,
    Transaction,
    TransactionRepository,
    UpdateTransactionParams,
} from '../../domain/index.js';

export class UpdateTransactionUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'findById' | 'update'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
    ) {}

    async execute(
        shopId: string,
        transactionId: string,
        userId: string,
        params: UpdateTransactionParams,
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

        const transaction =
            await this.transactionRepository.findById(transactionId);
        if (!transaction || transaction.shop_id !== shopId) {
            throw new TransactionNotFoundError(transactionId);
        }

        if (params.event_id) {
            const event = await this.eventRepository.findById(params.event_id);
            if (!event || event.shop_id !== shopId) {
                throw new EventNotFoundError(params.event_id);
            }
        }

        return await this.transactionRepository.update(transactionId, params);
    }
}

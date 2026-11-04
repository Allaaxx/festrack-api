import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { EventNotFoundError } from '../../errors/event.js';
import {
    Balance,
    EventRepository,
    ShopMemberRepository,
    ShopRepository,
    TransactionFilters,
    TransactionRepository,
} from '../../domain/index.js';

export class GetShopBalanceUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'getBalanceByShopId'
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
        userId: string,
        filters?: TransactionFilters,
    ): Promise<Balance> {
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

        if (filters?.event_id) {
            const event = await this.eventRepository.findById(filters.event_id);
            if (!event || event.shop_id !== shopId) {
                throw new EventNotFoundError(filters.event_id);
            }
        }

        return await this.transactionRepository.getBalanceByShopId(
            shopId,
            filters,
        );
    }
}

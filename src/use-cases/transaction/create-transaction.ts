import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { EventNotFoundError } from '../../errors/event.js';
import {
    CreateTransactionParams,
    DecimalLike,
    EventRepository,
    ShopMemberRepository,
    ShopRepository,
    Transaction,
    TransactionRepository,
} from '../../domain/index.js';

export interface CreateTransactionInput {
    shopId: string;
    userId: string;
    name: string;
    date: Date | string;
    amount: number | string | DecimalLike;
    type: 'EXPENSE' | 'EARNING' | 'INVESTMENT';
    event_id?: string | null;
}

export class CreateTransactionUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'create'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
    ) {}

    async execute(input: CreateTransactionInput): Promise<Transaction> {
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

        if (input.event_id) {
            const event = await this.eventRepository.findById(input.event_id);
            if (!event || event.shop_id !== input.shopId) {
                throw new EventNotFoundError(input.event_id);
            }
        }

        const createParams: CreateTransactionParams = {
            shop_id: input.shopId,
            created_by_user_id: input.userId,
            name: input.name,
            date: input.date,
            amount: input.amount,
            type: input.type,
            event_id: input.event_id ?? null,
        };

        return await this.transactionRepository.create(createParams);
    }
}

import { UserNotFoundError } from '../../errors/user.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    EventRepository,
    Transaction,
    TransactionFilters,
    TransactionRepository,
    UserRepository,
} from '../../domain/index.js';

export class GetTransactionByUserIdUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'findByUserId'
        >,
        private readonly userRepository: Pick<UserRepository, 'findById'>,
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
    ) {}

    async execute(
        userId: string,
        filters?: TransactionFilters,
    ): Promise<Transaction[]> {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        if (filters?.event_id) {
            const event = await this.eventRepository.findById(filters.event_id);

            if (!event) {
                throw new EventNotFoundError(filters.event_id);
            }

            if (event.user_id !== userId) {
                throw new ForbiddenError();
            }
        }

        const transactions = await this.transactionRepository.findByUserId(
            userId,
            filters,
        );

        return transactions;
    }
}

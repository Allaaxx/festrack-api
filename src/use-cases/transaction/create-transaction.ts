import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { UserNotFoundError } from '../../errors/user.js';
import {
    CreateTransactionParams,
    EventRepository,
    Transaction,
    TransactionRepository,
    UserRepository,
} from '../../domain/index.js';

export class CreateTransactionUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'create'
        >,
        private readonly userRepository: Pick<UserRepository, 'findById'>,
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
    ) {}

    async execute(params: CreateTransactionParams): Promise<Transaction> {
        const userId = params.user_id;

        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        if (params.event_id) {
            const event = await this.eventRepository.findById(params.event_id);

            if (!event) {
                throw new EventNotFoundError(params.event_id);
            }

            if (event.user_id !== userId) {
                throw new ForbiddenError();
            }
        }

        const transaction = await this.transactionRepository.create(params);

        return transaction;
    }
}

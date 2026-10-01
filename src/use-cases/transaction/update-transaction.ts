import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    EventRepository,
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
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
    ) {}

    async execute(
        transactionId: string,
        params: UpdateTransactionParams,
    ): Promise<Transaction> {
        const transaction =
            await this.transactionRepository.findById(transactionId);

        if (!transaction) {
            throw new TransactionNotFoundError(transactionId);
        }

        if (params.user_id && transaction.user_id !== params.user_id) {
            throw new ForbiddenError();
        }

        if (params.event_id) {
            const event = await this.eventRepository.findById(params.event_id);

            if (!event) {
                throw new EventNotFoundError(params.event_id);
            }

            if (event.user_id !== transaction.user_id) {
                throw new ForbiddenError();
            }
        }

        return await this.transactionRepository.update(transactionId, params);
    }
}

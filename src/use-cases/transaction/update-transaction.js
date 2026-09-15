import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';

export class UpdateTransactionUseCase {
    constructor(
        updateTransactionRepository,
        getTransactionByIdRepository,
        getEventByIdRepository,
    ) {
        this.updateTransactionRepository = updateTransactionRepository;
        this.getTransactionByIdRepository = getTransactionByIdRepository;
        this.getEventByIdRepository = getEventByIdRepository;
    }

    async execute(transactionId, params) {
        const transaction =
            await this.getTransactionByIdRepository.execute(transactionId);

        if (!transaction) {
            throw new TransactionNotFoundError(transactionId);
        }

        if (params.user_id && transaction.user_id !== params.user_id) {
            throw new ForbiddenError();
        }

        if (params.event_id) {
            const event = await this.getEventByIdRepository.execute(
                params.event_id,
            );

            if (!event) {
                throw new EventNotFoundError(params.event_id);
            }

            if (event.user_id !== transaction.user_id) {
                throw new ForbiddenError();
            }
        }

        return await this.updateTransactionRepository.execute(
            transactionId,
            params,
        );
    }
}

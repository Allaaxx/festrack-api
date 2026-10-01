import {
    TransactionNotFoundError,
    ForbiddenError,
} from '../../errors/index.js';

export class DeleteTransactionUseCase {
    constructor(transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    async execute(transactionId, userId) {
        const transaction =
            await this.transactionRepository.findById(transactionId);

        if (!transaction) {
            throw new TransactionNotFoundError(transactionId);
        }

        if (transaction.user_id !== userId) {
            throw new ForbiddenError();
        }

        const deletedTransaction =
            await this.transactionRepository.delete(transactionId);

        return deletedTransaction;
    }
}

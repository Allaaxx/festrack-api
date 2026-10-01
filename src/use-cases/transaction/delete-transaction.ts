import {
    TransactionNotFoundError,
    ForbiddenError,
} from '../../errors/index.js';
import { Transaction, TransactionRepository } from '../../domain/index.js';

export class DeleteTransactionUseCase {
    constructor(
        private readonly transactionRepository: Pick<
            TransactionRepository,
            'findById' | 'delete'
        >,
    ) {}

    async execute(transactionId: string, userId: string): Promise<Transaction> {
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

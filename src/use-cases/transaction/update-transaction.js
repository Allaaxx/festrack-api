import { ForbiddenError } from '../../errors/index.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';

export class UpdateTransactionUseCase {
    constructor(updateTransactionRepository, getTransactionByIdRepository) {
        this.updateTransactionRepository = updateTransactionRepository;
        this.getTransactionByIdRepository = getTransactionByIdRepository;
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

        return await this.updateTransactionRepository.execute(
            transactionId,
            params,
        );
    }
}

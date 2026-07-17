import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    checkIfIdIsValid,
    invalidIdResponse,
    ok,
    serverError,
    transactionNotFoundResponse,
} from '../helpers/index.js';

export class DeleteTransactionController {
    constructor(deleteTransactionUseCase) {
        this.deleteTransactionUseCase = deleteTransactionUseCase;
    }
    async execute(httpRequest) {
        try {
            const isIdValid = checkIfIdIsValid(
                httpRequest.params.transactionId,
            );

            if (!isIdValid) {
                return invalidIdResponse();
            }

            const deletedTransaction =
                await this.deleteTransactionUseCase.execute(
                    httpRequest.params.transactionId,
                    httpRequest.user_id,
                );

            if (!deletedTransaction) {
                return transactionNotFoundResponse();
            }
            return ok(deletedTransaction);
        } catch (error) {
            if (error instanceof TransactionNotFoundError) {
                return transactionNotFoundResponse();
            }
            console.error(error);
            return serverError();
        }
    }
}

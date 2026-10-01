import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    checkIfIdIsValid,
    invalidIdResponse,
    ok,
    serverError,
    transactionNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { DeleteTransactionUseCase } from '../../use-cases/index.js';

export class DeleteTransactionController implements Controller {
    constructor(
        private readonly deleteTransactionUseCase: Pick<
            DeleteTransactionUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<
            any,
            { transactionId: string; user_id: string }
        >,
    ): Promise<HttpResponse> {
        try {
            const transactionId = httpRequest.params?.transactionId;
            const userId = httpRequest.params?.user_id;

            if (!transactionId || !userId) {
                return invalidIdResponse();
            }

            const transactionIdIsValid = checkIfIdIsValid(transactionId);
            const userIdIsValid = checkIfIdIsValid(userId);

            if (!transactionIdIsValid || !userIdIsValid) {
                return invalidIdResponse();
            }

            const deletedTransaction =
                await this.deleteTransactionUseCase.execute(
                    transactionId,
                    userId,
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

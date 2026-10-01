import { ZodError } from 'zod';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    badRequest,
    ok,
    serverError,
    transactionNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { Transaction } from '../../domain/entities/transaction.js';
import {
    deleteTransactionParamsSchema,
    DeleteTransactionParamsSchema,
} from '../../schemas/index.js';

export interface IDeleteTransactionUseCase {
    execute(transactionId: string, userId: string): Promise<Transaction | null>;
}

export class DeleteTransactionController implements Controller<
    never,
    DeleteTransactionParamsSchema
> {
    constructor(
        private readonly deleteTransactionUseCase: IDeleteTransactionUseCase,
    ) {}

    async execute(
        httpRequest: HttpRequest<never, DeleteTransactionParamsSchema>,
    ): Promise<HttpResponse> {
        try {
            const { transactionId, user_id } =
                await deleteTransactionParamsSchema.parseAsync(
                    httpRequest.params,
                );

            const deletedTransaction =
                await this.deleteTransactionUseCase.execute(
                    transactionId,
                    user_id,
                );

            if (!deletedTransaction) {
                return transactionNotFoundResponse();
            }
            return ok(deletedTransaction);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            if (error instanceof TransactionNotFoundError) {
                return transactionNotFoundResponse();
            }
            console.error(error);
            return serverError();
        }
    }
}

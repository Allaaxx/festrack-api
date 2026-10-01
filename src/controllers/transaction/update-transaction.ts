import { ZodError } from 'zod';
import {
    updatedTransactionSchema,
    UpdateTransactionSchema,
} from '../../schemas/transaction.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    badRequest,
    eventNotFoundResponse,
    forbidden,
    ok,
    serverError,
    transactionNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { ForbiddenError } from '../../errors/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { Controller, HttpRequest } from '../protocols.js';
import { Transaction } from '../../domain/entities/transaction.js';
import {
    transactionIdParamSchema,
    TransactionIdParamSchema,
} from '../../schemas/index.js';

export interface IUpdateTransactionUseCase {
    execute(
        transactionId: string,
        params: UpdateTransactionSchema,
    ): Promise<Transaction | null>;
}

export class UpdateTransactionController implements Controller<
    UpdateTransactionSchema,
    TransactionIdParamSchema
> {
    constructor(
        private readonly updateTransactionUseCase: IUpdateTransactionUseCase,
    ) {}

    async execute(
        httpRequest: HttpRequest<
            UpdateTransactionSchema,
            TransactionIdParamSchema
        >,
    ): Promise<HttpResponse> {
        try {
            const { transactionId } = await transactionIdParamSchema.parseAsync(
                httpRequest.params,
            );

            const sanitizedBody = await updatedTransactionSchema.parseAsync(
                httpRequest.body,
            );

            const transaction = await this.updateTransactionUseCase.execute(
                transactionId,
                sanitizedBody,
            );

            return ok(transaction);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            if (error instanceof TransactionNotFoundError) {
                return transactionNotFoundResponse();
            }
            if (error instanceof EventNotFoundError) {
                return eventNotFoundResponse();
            }
            if (error instanceof ForbiddenError) {
                return forbidden();
            }
            console.error(error);
            return serverError();
        }
    }
}

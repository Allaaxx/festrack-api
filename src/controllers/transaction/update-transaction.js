import { ZodError } from 'zod';
import { updatedTransactionSchema } from '../../schemas/transaction.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import {
    badRequest,
    checkIfIdIsValid,
    eventNotFoundResponse,
    forbidden,
    invalidIdResponse,
    ok,
    serverError,
    transactionNotFoundResponse,
} from '../helpers/index.js';
import { ForbiddenError } from '../../errors/index.js';
import { EventNotFoundError } from '../../errors/event.js';
export class UpdateTransactionController {
    constructor(updateTransactionUseCase) {
        this.updateTransactionUseCase = updateTransactionUseCase;
    }
    async execute(httpRequest) {
        try {
            const isIdValid = checkIfIdIsValid(
                httpRequest.params.transactionId,
            );

            if (!isIdValid) {
                return invalidIdResponse();
            }

            const params = httpRequest.body;

            await updatedTransactionSchema.parseAsync(params);

            const transaction = await this.updateTransactionUseCase.execute(
                httpRequest.params.transactionId,
                params,
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

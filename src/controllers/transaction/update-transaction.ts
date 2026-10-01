import { ZodError } from 'zod';
import {
    updatedTransactionSchema,
    UpdateTransactionSchema,
} from '../../schemas/transaction.js';
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
    HttpResponse,
} from '../helpers/index.js';
import { ForbiddenError } from '../../errors/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { Controller, HttpRequest } from '../protocols.js';
import { UpdateTransactionUseCase } from '../../use-cases/index.js';

export class UpdateTransactionController implements Controller {
    constructor(
        private readonly updateTransactionUseCase: Pick<
            UpdateTransactionUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<
            UpdateTransactionSchema,
            { transactionId: string }
        >,
    ): Promise<HttpResponse> {
        try {
            const transactionId = httpRequest.params?.transactionId;

            if (!transactionId) {
                return invalidIdResponse();
            }

            const isIdValid = checkIfIdIsValid(transactionId);

            if (!isIdValid) {
                return invalidIdResponse();
            }

            const params = httpRequest.body;

            await updatedTransactionSchema.parseAsync(params);

            const transaction = await this.updateTransactionUseCase.execute(
                transactionId,
                params!,
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

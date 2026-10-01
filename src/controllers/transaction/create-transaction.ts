import { ZodError } from 'zod';
import {
    createTransactionSchema,
    CreateTransactionSchema,
} from '../../schemas/index.js';
import {
    badRequest,
    created,
    eventNotFoundResponse,
    forbidden,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Controller, HttpRequest } from '../protocols.js';
import { Transaction } from '../../domain/entities/transaction.js';

export interface ICreateTransactionUseCase {
    execute(params: CreateTransactionSchema): Promise<Transaction>;
}

export class CreateTransactionController implements Controller<CreateTransactionSchema> {
    constructor(
        private readonly createTransactionUseCase: ICreateTransactionUseCase,
    ) {}

    async execute(
        httpRequest: HttpRequest<CreateTransactionSchema>,
    ): Promise<HttpResponse> {
        try {
            const validatedParams = await createTransactionSchema.parseAsync(
                httpRequest.body,
            );

            const transaction =
                await this.createTransactionUseCase.execute(validatedParams);

            return created(transaction);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({ message: error.issues[0].message });
            }

            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
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

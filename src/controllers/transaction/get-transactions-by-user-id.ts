import { ZodError } from 'zod';
import { UserNotFoundError } from '../../errors/user.js';
import { getTransactionByUserIdSchema } from '../../schemas/transaction.js';
import {
    badRequest,
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { Transaction } from '../../domain/entities/transaction.js';

export interface IGetTransactionsByUserIdUseCase {
    execute(userId: string, from: string, to: string): Promise<Transaction[]>;
}

export class GetTransactionsByUserIdController implements Controller {
    constructor(
        private readonly getTransactionsByUserIdUseCase: IGetTransactionsByUserIdUseCase,
    ) {}

    async execute(
        httpRequest: HttpRequest<
            any,
            any,
            { userId?: string; from?: string; to?: string }
        >,
    ): Promise<HttpResponse> {
        try {
            const user_id = httpRequest.query?.userId;
            const from = httpRequest.query?.from;
            const to = httpRequest.query?.to;

            const validatedQuery =
                await getTransactionByUserIdSchema.parseAsync({
                    user_id,
                    from,
                    to,
                });

            const transactions =
                await this.getTransactionsByUserIdUseCase.execute(
                    validatedQuery.user_id,
                    validatedQuery.from,
                    validatedQuery.to,
                );
            return ok(transactions);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({ message: error.issues[0].message });
            }
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }
            console.error(error);
            return serverError();
        }
    }
}

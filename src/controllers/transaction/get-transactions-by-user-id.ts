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
import { GetTransactionByUserIdUseCase } from '../../use-cases/index.js';

export class GetTransactionsByUserIdController implements Controller {
    constructor(
        private readonly getTransactionsByUserIdUseCase: Pick<
            GetTransactionByUserIdUseCase,
            'execute'
        >,
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

            await getTransactionByUserIdSchema.parseAsync({
                user_id,
                from,
                to,
            });

            const transactions =
                await this.getTransactionsByUserIdUseCase.execute(
                    user_id!,
                    from!,
                    to!,
                );
            return ok(transactions);
        } catch (error) {
            console.error(error);
            if (error instanceof ZodError) {
                return badRequest({ message: error.issues[0].message });
            }
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }
            return serverError();
        }
    }
}

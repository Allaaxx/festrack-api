import { ZodError } from 'zod';
import { UserNotFoundError } from '../../errors/user.js';
import { getUserBalanceSchema } from '../../schemas/user.js';
import {
    badRequest,
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { GetUserBalanceUseCase } from '../../use-cases/user/get-user-balance.js';

export class GetUserBalanceController implements Controller {
    constructor(private readonly getUserBalanceUseCase: Pick<GetUserBalanceUseCase, 'execute'>) {}

    async execute(httpRequest: HttpRequest): Promise<HttpResponse> {
        try {
            const userId = httpRequest.params?.userId;
            const from = httpRequest.query?.from;
            const to = httpRequest.query?.to;

            await getUserBalanceSchema.parseAsync({
                user_id: userId,
                from,
                to,
            });

            const balance = await this.getUserBalanceUseCase.execute(
                userId,
                from,
                to,
            );

            return ok(balance);
        } catch (error) {
            console.error(error);
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            return serverError();
        }
    }
}

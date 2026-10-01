import { ZodError } from 'zod';
import { UserNotFoundError } from '../../errors/user.js';
import {
    getUserBalanceQuerySchema,
    GetUserBalanceQuerySchema,
    userIdParamSchema,
    UserIdParamSchema,
} from '../../schemas/index.js';
import {
    badRequest,
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { UserBalance } from '../../domain/entities/user.js';

export interface IGetUserBalanceUseCase {
    execute(userId: string, from: string, to: string): Promise<UserBalance>;
}

export class GetUserBalanceController implements Controller<
    never,
    UserIdParamSchema,
    GetUserBalanceQuerySchema
> {
    constructor(
        private readonly getUserBalanceUseCase: IGetUserBalanceUseCase,
    ) {}

    async execute(
        httpRequest: HttpRequest<
            never,
            UserIdParamSchema,
            GetUserBalanceQuerySchema
        >,
    ): Promise<HttpResponse> {
        try {
            const { userId } = await userIdParamSchema.parseAsync(
                httpRequest.params,
            );
            const { from, to } = await getUserBalanceQuerySchema.parseAsync(
                httpRequest.query,
            );

            const balance = await this.getUserBalanceUseCase.execute(
                userId,
                from,
                to,
            );

            return ok(balance);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }
            console.error(error);
            return serverError();
        }
    }
}

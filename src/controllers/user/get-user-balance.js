import { ZodError } from 'zod';
import { UserNotFoundError } from '../../errors/user.js';
import { getUserBalanceSchema } from '../../schemas/user.js';
import {
    badRequest,
    ok,
    serverError,
    userNotFoundResponse,
} from '../helpers/index.js';

export class GetUserBalanceController {
    constructor(getUserBalanceUseCase) {
        this.getUserBalanceUseCase = getUserBalanceUseCase;
    }
    async execute(httpRequest) {
        try {
            const userId = httpRequest.params.userId;
            const from = httpRequest.query.from;
            const to = httpRequest.query.to;

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

import { ZodError } from 'zod';
import { loginSchema } from '../../schemas/index.js';
import {
    serverError,
    badRequest,
    ok,
    unauthorized,
    notFound,
} from '../helpers/index.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';

export class LoginUserController {
    constructor(loginUserUseCase) {
        this.loginUserUseCase = loginUserUseCase;
    }

    async execute(httpRequest) {
        try {
            const params = httpRequest.body;
            await loginSchema.parseAsync(params);
            const user = await this.loginUserUseCase.execute(
                params.email,
                params.password,
            );

            return ok(user);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }

            if (error instanceof InvalidPasswordError) {
                return unauthorized({
                    message: error.message,
                });
            }

            if (error instanceof UserNotFoundError) {
                return notFound({
                    message: 'User not found',
                });
            }

            return serverError();
        }
    }
}

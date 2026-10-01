import { ZodError } from 'zod';
import { loginSchema, LoginSchema } from '../../schemas/index.js';
import {
    serverError,
    badRequest,
    ok,
    unauthorized,
    notFound,
    HttpResponse,
} from '../helpers/index.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';
import { Controller, HttpRequest } from '../protocols.js';
import { LoginUserUseCase } from '../../use-cases/index.js';

export class LoginUserController implements Controller {
    constructor(
        private readonly loginUserUseCase: Pick<LoginUserUseCase, 'execute'>,
    ) {}

    async execute(
        httpRequest: HttpRequest<LoginSchema>,
    ): Promise<HttpResponse> {
        try {
            const params = await loginSchema.parseAsync(httpRequest.body);
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
                return unauthorized();
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

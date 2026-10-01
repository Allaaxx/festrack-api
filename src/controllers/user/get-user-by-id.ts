import { ZodError } from 'zod';
import { User } from '../../domain/entities/user.js';
import { userIdParamSchema, UserIdParamSchema } from '../../schemas/index.js';
import {
    badRequest,
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';

export interface IGetUserByIdUseCase {
    execute(userId: string): Promise<User | null>;
}

export class GetUserByIdController implements Controller<
    never,
    UserIdParamSchema
> {
    constructor(private readonly getUserByIdUseCase: IGetUserByIdUseCase) {}

    async execute(
        httpRequest: HttpRequest<never, UserIdParamSchema>,
    ): Promise<HttpResponse> {
        try {
            const { userId } = await userIdParamSchema.parseAsync(
                httpRequest.params,
            );

            const user = await this.getUserByIdUseCase.execute(userId);

            if (!user) {
                return userNotFoundResponse();
            }

            return ok(user);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            console.error(error);
            return serverError();
        }
    }
}

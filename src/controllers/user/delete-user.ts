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
import { UserNotFoundError } from '../../errors/user.js';
import { Controller, HttpRequest } from '../protocols.js';

export interface IDeleteUserUseCase {
    execute(userId: string): Promise<User | null>;
}

export class DeleteUserController implements Controller<
    never,
    UserIdParamSchema
> {
    constructor(private readonly deleteUserUseCase: IDeleteUserUseCase) {}

    async execute(
        httpRequest: HttpRequest<never, UserIdParamSchema>,
    ): Promise<HttpResponse> {
        try {
            const { userId } = await userIdParamSchema.parseAsync(
                httpRequest.params,
            );

            const deletedUser = await this.deleteUserUseCase.execute(userId);

            return ok(deletedUser);
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

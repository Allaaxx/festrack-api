import { ZodError } from 'zod';
import {
    EmailAlreadyInUseError,
    UserNotFoundError,
} from '../../errors/user.js';
import {
    updatedUserSchema,
    UpdateUserSchema,
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
import { User } from '../../domain/entities/user.js';

export interface IUpdateUserUseCase {
    execute(
        userId: string,
        updateUserParams: UpdateUserSchema,
    ): Promise<User | null>;
}

export class UpdateUserController implements Controller<
    UpdateUserSchema,
    UserIdParamSchema
> {
    constructor(private readonly updateUserUseCase: IUpdateUserUseCase) {}

    async execute(
        httpRequest: HttpRequest<UpdateUserSchema, UserIdParamSchema>,
    ): Promise<HttpResponse> {
        try {
            const { userId } = await userIdParamSchema.parseAsync(
                httpRequest.params,
            );

            const sanitizedBody = await updatedUserSchema.parseAsync(
                httpRequest.body,
            );

            const updatedUser = await this.updateUserUseCase.execute(
                userId,
                sanitizedBody,
            );

            return ok(updatedUser);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            if (error instanceof EmailAlreadyInUseError) {
                return badRequest({ message: error.message });
            }
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }
            console.error(error);
            return serverError();
        }
    }
}

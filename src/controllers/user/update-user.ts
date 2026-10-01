import { ZodError } from 'zod';
import {
    EmailAlreadyInUseError,
    UserNotFoundError,
} from '../../errors/user.js';
import { updatedUserSchema } from '../../schemas/user.js';
import { badRequest, ok, serverError, HttpResponse } from '../helpers/http.js';
import {
    checkIfIdIsValid,
    invalidIdResponse,
    userNotFoundResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { UpdateUserUseCase } from '../../use-cases/user/update-user.js';

export class UpdateUserController implements Controller {
    constructor(private readonly updateUserUseCase: Pick<UpdateUserUseCase, 'execute'>) {}

    async execute(httpRequest: HttpRequest): Promise<HttpResponse> {
        try {
            const userId = httpRequest.params?.userId;

            const isIdValid = checkIfIdIsValid(userId);

            if (!isIdValid) {
                return invalidIdResponse();
            }

            const params = httpRequest.body;

            await updatedUserSchema.parseAsync(params);

            const updatedUser = await this.updateUserUseCase.execute(
                userId,
                params,
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

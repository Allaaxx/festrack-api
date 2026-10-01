import {
    checkIfIdIsValid,
    invalidIdResponse,
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';
import { Controller, HttpRequest } from '../protocols.js';
import { DeleteUserUseCase } from '../../use-cases/user/delete-user.js';

export class DeleteUserController implements Controller {
    constructor(private readonly deleteUserUseCase: Pick<DeleteUserUseCase, 'execute'>) {}

    async execute(httpRequest: HttpRequest): Promise<HttpResponse> {
        try {
            const userId = httpRequest.params?.userId;

            const idIsValid = checkIfIdIsValid(userId);

            if (!idIsValid) {
                return invalidIdResponse();
            }

            const deletedUser = await this.deleteUserUseCase.execute(userId);

            return ok(deletedUser);
        } catch (error) {
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }
            console.error(error);
            return serverError();
        }
    }
}

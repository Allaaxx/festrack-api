import {
    checkIfIdIsValid,
    invalidIdResponse,
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { GetUserByIdUseCase } from '../../use-cases/user/get-user-by-id.js';

export class GetUserByIdController implements Controller {
    constructor(private readonly getUserByIdUseCase: Pick<GetUserByIdUseCase, 'execute'>) {}

    async execute(httpRequest: HttpRequest): Promise<HttpResponse> {
        try {
            const userId = httpRequest.params?.userId;
            const isIdValid = checkIfIdIsValid(userId);

            if (!isIdValid) {
                return invalidIdResponse();
            }

            const user = await this.getUserByIdUseCase.execute(userId);

            if (!user) {
                return userNotFoundResponse();
            }

            return ok(user);
        } catch (error) {
            console.error(error);
            return serverError();
        }
    }
}

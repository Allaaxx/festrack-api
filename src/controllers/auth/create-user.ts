import { ZodError } from 'zod';
import { EmailAlreadyInUseError } from '../../errors/user.js';
import { createUserSchema, CreateUserSchema } from '../../schemas/index.js';
import {
    badRequest,
    created,
    serverError,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { CreateUserUseCase } from '../../use-cases/index.js';

export class CreateUserController implements Controller {
    constructor(
        private readonly createUserUseCase: Pick<CreateUserUseCase, 'execute'>,
    ) {}

    async execute(
        httpRequest: HttpRequest<CreateUserSchema>,
    ): Promise<HttpResponse> {
        try {
            const params = await createUserSchema.parseAsync(httpRequest.body);

            const createdUser = await this.createUserUseCase.execute(params);

            return created(createdUser);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({
                    message: error.issues[0].message,
                });
            }
            if (error instanceof EmailAlreadyInUseError) {
                return badRequest({ message: error.message });
            }
            console.log(error);
            return serverError();
        }
    }
}

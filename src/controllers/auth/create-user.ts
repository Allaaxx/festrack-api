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
import { UserWithTokens } from '../../domain/index.js';

export interface ICreateUserUseCase {
    execute(params: CreateUserSchema): Promise<UserWithTokens>;
}

export class CreateUserController implements Controller<CreateUserSchema> {
    constructor(private readonly createUserUseCase: ICreateUserUseCase) {}

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
            console.error(error);
            return serverError();
        }
    }
}

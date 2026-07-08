import { ZodError } from 'zod';
import { createTransactionSchema } from '../../schemas/index.js';
import { badRequest, created, serverError, userNotFoundResponse } from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';

export class CreateTransactionController {
    constructor(createTransactionUseCase) {
        this.createTransactionUseCase = createTransactionUseCase;
    }
    async execute(httpRequest) {
        try {
            const params = httpRequest.body;
            const validatedParams =
                await createTransactionSchema.parseAsync(params);

            const transaction =
                await this.createTransactionUseCase.execute(validatedParams);

            return created(transaction);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({ message: error.issues[0].message });
            }

            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }

            console.error(error);
            return serverError();
        }
    }
}

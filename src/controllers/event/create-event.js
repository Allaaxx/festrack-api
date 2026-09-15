import { ZodError } from 'zod';
import { createEventSchema } from '../../schemas/index.js';
import {
    badRequest,
    created,
    serverError,
    userNotFoundResponse,
} from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';

export class CreateEventController {
    constructor(createEventUseCase) {
        this.createEventUseCase = createEventUseCase;
    }

    async execute(httpRequest) {
        try {
            const params = httpRequest.body;
            const validatedParams = await createEventSchema.parseAsync(params);

            const event = await this.createEventUseCase.execute(validatedParams);

            return created(event);
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

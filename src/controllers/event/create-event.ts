import { ZodError } from 'zod';
import { createEventSchema, CreateEventSchema } from '../../schemas/index.js';
import {
    badRequest,
    created,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';
import { Controller, HttpRequest } from '../protocols.js';
import { CreateEventUseCase } from '../../use-cases/index.js';

export class CreateEventController implements Controller {
    constructor(
        private readonly createEventUseCase: Pick<
            CreateEventUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<CreateEventSchema>,
    ): Promise<HttpResponse> {
        try {
            const params = httpRequest.body;
            const validatedParams = await createEventSchema.parseAsync(params);

            const event =
                await this.createEventUseCase.execute(validatedParams);

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

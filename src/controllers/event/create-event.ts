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
import { Event } from '../../domain/entities/event.js';

export interface ICreateEventUseCase {
    execute(params: CreateEventSchema): Promise<Event>;
}

export class CreateEventController implements Controller<CreateEventSchema> {
    constructor(private readonly createEventUseCase: ICreateEventUseCase) {}

    async execute(
        httpRequest: HttpRequest<CreateEventSchema>,
    ): Promise<HttpResponse> {
        try {
            const validatedParams = await createEventSchema.parseAsync(
                httpRequest.body,
            );

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

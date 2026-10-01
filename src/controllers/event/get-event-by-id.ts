import { ZodError } from 'zod';
import {
    badRequest,
    eventNotFoundResponse,
    forbidden,
    ok,
    serverError,
    HttpResponse,
} from '../helpers/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { Event } from '../../domain/entities/event.js';
import { eventIdParamSchema, EventIdParamSchema } from '../../schemas/index.js';

export interface IGetEventByIdUseCase {
    execute(eventId: string, userId: string): Promise<Event | null>;
}

export class GetEventByIdController implements Controller<
    never,
    EventIdParamSchema
> {
    constructor(private readonly getEventByIdUseCase: IGetEventByIdUseCase) {}

    async execute(
        httpRequest: HttpRequest<never, EventIdParamSchema>,
    ): Promise<HttpResponse> {
        try {
            const { eventId } = await eventIdParamSchema.parseAsync(
                httpRequest.params,
            );
            const userId = httpRequest.userId;

            const event = await this.getEventByIdUseCase.execute(
                eventId,
                userId!,
            );

            return ok(event);
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({ message: error.issues[0].message });
            }

            if (error instanceof EventNotFoundError) {
                return eventNotFoundResponse();
            }

            if (error instanceof ForbiddenError) {
                return forbidden();
            }

            console.error(error);
            return serverError();
        }
    }
}

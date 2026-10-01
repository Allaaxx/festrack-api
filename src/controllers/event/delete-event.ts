import { ZodError } from 'zod';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    badRequest,
    eventNotFoundResponse,
    forbidden,
    ok,
    serverError,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { Event } from '../../domain/entities/event.js';
import { eventIdParamSchema, EventIdParamSchema } from '../../schemas/index.js';

export interface IDeleteEventUseCase {
    execute(eventId: string, userId: string): Promise<Event | null>;
}

export class DeleteEventController implements Controller<
    never,
    EventIdParamSchema
> {
    constructor(private readonly deleteEventUseCase: IDeleteEventUseCase) {}

    async execute(
        httpRequest: HttpRequest<never, EventIdParamSchema>,
    ): Promise<HttpResponse> {
        try {
            const { eventId } = await eventIdParamSchema.parseAsync(
                httpRequest.params,
            );

            const deletedEvent = await this.deleteEventUseCase.execute(
                eventId,
                httpRequest.userId!,
            );

            return ok(deletedEvent);
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

import { ZodError } from 'zod';
import {
    eventIdParamSchema,
    EventIdParamSchema,
    updateEventSchema,
    UpdateEventSchema,
} from '../../schemas/index.js';
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

export interface IUpdateEventUseCase {
    execute(
        eventId: string,
        userId: string,
        params: UpdateEventSchema,
    ): Promise<Event | null>;
}

export class UpdateEventController implements Controller<
    UpdateEventSchema,
    EventIdParamSchema
> {
    constructor(private readonly updateEventUseCase: IUpdateEventUseCase) {}

    async execute(
        httpRequest: HttpRequest<UpdateEventSchema, EventIdParamSchema>,
    ): Promise<HttpResponse> {
        try {
            const { eventId } = await eventIdParamSchema.parseAsync(
                httpRequest.params,
            );
            const sanitizedBody = await updateEventSchema.parseAsync(
                httpRequest.body,
            );

            const event = await this.updateEventUseCase.execute(
                eventId,
                httpRequest.userId!,
                sanitizedBody,
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

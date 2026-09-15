import { ZodError } from 'zod';
import { updateEventSchema } from '../../schemas/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    badRequest,
    checkIfIdIsValid,
    eventNotFoundResponse,
    forbidden,
    invalidIdResponse,
    ok,
    serverError,
} from '../helpers/index.js';

export class UpdateEventController {
    constructor(updateEventUseCase) {
        this.updateEventUseCase = updateEventUseCase;
    }

    async execute(httpRequest) {
        try {
            const eventId = httpRequest.params.eventId;
            const userId = httpRequest.userId;

            const isIdValid = checkIfIdIsValid(eventId);
            if (!isIdValid) {
                return invalidIdResponse();
            }

            const params = httpRequest.body;
            await updateEventSchema.parseAsync(params);

            const event = await this.updateEventUseCase.execute(
                eventId,
                userId,
                params,
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

import {
    checkIfIdIsValid,
    eventNotFoundResponse,
    forbidden,
    invalidIdResponse,
    ok,
    serverError,
} from '../helpers/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';

export class GetEventByIdController {
    constructor(getEventByIdUseCase) {
        this.getEventByIdUseCase = getEventByIdUseCase;
    }

    async execute(httpRequest) {
        try {
            const eventId = httpRequest.params.eventId;
            const userId = httpRequest.userId;

            const isIdValid = checkIfIdIsValid(eventId);
            if (!isIdValid) {
                return invalidIdResponse();
            }

            const event = await this.getEventByIdUseCase.execute(
                eventId,
                userId,
            );

            return ok(event);
        } catch (error) {
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

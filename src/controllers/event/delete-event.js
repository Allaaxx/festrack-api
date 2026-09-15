import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    checkIfIdIsValid,
    eventNotFoundResponse,
    forbidden,
    invalidIdResponse,
    noContent,
    serverError,
} from '../helpers/index.js';

export class DeleteEventController {
    constructor(deleteEventUseCase) {
        this.deleteEventUseCase = deleteEventUseCase;
    }

    async execute(httpRequest) {
        try {
            const eventId = httpRequest.params.eventId;
            const userId = httpRequest.userId;

            const isIdValid = checkIfIdIsValid(eventId);
            if (!isIdValid) {
                return invalidIdResponse();
            }

            await this.deleteEventUseCase.execute(eventId, userId);

            return noContent();
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

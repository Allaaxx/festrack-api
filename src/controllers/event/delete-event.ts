import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    checkIfIdIsValid,
    eventNotFoundResponse,
    forbidden,
    invalidIdResponse,
    ok,
    serverError,
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { DeleteEventUseCase } from '../../use-cases/index.js';

export class DeleteEventController implements Controller {
    constructor(
        private readonly deleteEventUseCase: Pick<
            DeleteEventUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<any, { eventId: string }>,
    ): Promise<HttpResponse> {
        try {
            const eventId = httpRequest.params?.eventId;
            const userId = httpRequest.userId;

            if (!eventId) {
                return invalidIdResponse();
            }

            const isIdValid = checkIfIdIsValid(eventId);
            if (!isIdValid) {
                return invalidIdResponse();
            }

            const deletedEvent = await this.deleteEventUseCase.execute(
                eventId,
                userId!,
            );

            return ok(deletedEvent);
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

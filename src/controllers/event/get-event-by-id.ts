import {
    checkIfIdIsValid,
    eventNotFoundResponse,
    forbidden,
    invalidIdResponse,
    ok,
    serverError,
    HttpResponse,
} from '../helpers/index.js';
import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { GetEventByIdUseCase } from '../../use-cases/index.js';

export class GetEventByIdController implements Controller {
    constructor(
        private readonly getEventByIdUseCase: Pick<
            GetEventByIdUseCase,
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

            const event = await this.getEventByIdUseCase.execute(
                eventId,
                userId!,
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

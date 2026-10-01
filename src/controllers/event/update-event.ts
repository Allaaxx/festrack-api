import { ZodError } from 'zod';
import { updateEventSchema, UpdateEventSchema } from '../../schemas/index.js';
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
    HttpResponse,
} from '../helpers/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { UpdateEventUseCase } from '../../use-cases/index.js';

export class UpdateEventController implements Controller {
    constructor(
        private readonly updateEventUseCase: Pick<
            UpdateEventUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<UpdateEventSchema, { eventId: string }>,
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

            const params = httpRequest.body;
            await updateEventSchema.parseAsync(params);

            const event = await this.updateEventUseCase.execute(
                eventId,
                userId!,
                params!,
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

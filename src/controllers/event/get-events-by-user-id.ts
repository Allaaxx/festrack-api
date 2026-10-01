import {
    ok,
    serverError,
    userNotFoundResponse,
    HttpResponse,
} from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';
import { Controller, HttpRequest } from '../protocols.js';
import { GetEventsByUserIdUseCase } from '../../use-cases/index.js';

export class GetEventsByUserIdController implements Controller {
    constructor(
        private readonly getEventsByUserIdUseCase: Pick<
            GetEventsByUserIdUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<any, any, { userId: string }>,
    ): Promise<HttpResponse> {
        try {
            const userId = httpRequest.query?.userId;

            const events = await this.getEventsByUserIdUseCase.execute(userId!);

            return ok(events);
        } catch (error) {
            if (error instanceof UserNotFoundError) {
                return userNotFoundResponse();
            }

            console.error(error);
            return serverError();
        }
    }
}

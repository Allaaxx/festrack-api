import { ok, serverError, userNotFoundResponse } from '../helpers/index.js';
import { UserNotFoundError } from '../../errors/user.js';

export class GetEventsByUserIdController {
    constructor(getEventsByUserIdUseCase) {
        this.getEventsByUserIdUseCase = getEventsByUserIdUseCase;
    }

    async execute(httpRequest) {
        try {
            const userId = httpRequest.query.userId;

            const events = await this.getEventsByUserIdUseCase.execute(userId);

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

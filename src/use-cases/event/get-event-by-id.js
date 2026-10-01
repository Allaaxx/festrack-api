import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';

export class GetEventByIdUseCase {
    constructor(eventRepository) {
        this.eventRepository = eventRepository;
    }

    async execute(eventId, userId) {
        const event = await this.eventRepository.findById(eventId);

        if (!event) {
            throw new EventNotFoundError(eventId);
        }

        if (event.user_id !== userId) {
            throw new ForbiddenError();
        }

        return event;
    }
}

import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { Event, EventRepository } from '../../domain/index.js';

export class GetEventByIdUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
    ) {}

    async execute(eventId: string, userId: string): Promise<Event> {
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

import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    Event,
    UpdateEventParams,
    EventRepository,
} from '../../domain/index.js';

export class UpdateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<
            EventRepository,
            'findById' | 'update'
        >,
    ) {}

    async execute(
        eventId: string,
        userId: string,
        updateParams: UpdateEventParams,
    ): Promise<Event> {
        const event = await this.eventRepository.findById(eventId);

        if (!event) {
            throw new EventNotFoundError(eventId);
        }

        if (event.user_id !== userId) {
            throw new ForbiddenError();
        }

        return await this.eventRepository.update(eventId, updateParams);
    }
}

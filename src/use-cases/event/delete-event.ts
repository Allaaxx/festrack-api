import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    Event,
    EventRepository,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

export class DeleteEventUseCase {
    constructor(
        private readonly eventRepository: Pick<
            EventRepository,
            'findById' | 'delete'
        >,
        private readonly userRepository?: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<
            GoogleCalendarAdapter,
            'delete'
        >,
    ) {}

    async execute(eventId: string, userId: string): Promise<Event> {
        const event = await this.eventRepository.findById(eventId);

        if (!event) {
            throw new EventNotFoundError(eventId);
        }

        if (event.user_id !== userId) {
            throw new ForbiddenError();
        }

        if (
            event.google_event_id &&
            this.calendarAdapter &&
            this.userRepository
        ) {
            const user = await this.userRepository.findById(userId);
            if (user?.google_calendar_sync_enabled) {
                try {
                    await this.calendarAdapter.delete(
                        userId,
                        event.google_event_id,
                    );
                } catch (error) {
                    console.error(
                        'Failed to delete event on Google Calendar (non-blocking):',
                        error,
                    );
                }
            }
        }

        return await this.eventRepository.delete(eventId);
    }
}

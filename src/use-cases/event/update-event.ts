import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import {
    Event,
    UpdateEventParams,
    EventRepository,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

export class UpdateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<
            EventRepository,
            'findById' | 'update'
        >,
        private readonly userRepository?: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<GoogleCalendarAdapter, 'patch'>,
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

        if (
            event.google_event_id &&
            this.calendarAdapter &&
            this.userRepository
        ) {
            const user = await this.userRepository.findById(userId);
            if (user?.google_calendar_sync_enabled) {
                try {
                    await this.calendarAdapter.patch(
                        userId,
                        event.google_event_id,
                        {
                            name: updateParams.name,
                            description: updateParams.description,
                            start_date: updateParams.start_date,
                            end_date: updateParams.end_date,
                        },
                    );
                } catch (error) {
                    console.error(
                        'Failed to patch event on Google Calendar (non-blocking):',
                        error,
                    );
                }
            }
        }

        return await this.eventRepository.update(eventId, updateParams);
    }
}

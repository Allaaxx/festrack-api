import { UserNotFoundError } from '../../errors/user.js';
import {
    Event,
    CreateEventParams,
    EventRepository,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

export class CreateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'create'>,
        private readonly userRepository: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<
            GoogleCalendarAdapter,
            'insert'
        >,
    ) {}

    async execute(params: CreateEventParams): Promise<Event> {
        const userId = params.user_id;

        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new UserNotFoundError(userId);
        }

        let googleEventId: string | null = null;
        if (user.google_calendar_sync_enabled && this.calendarAdapter) {
            try {
                googleEventId = await this.calendarAdapter.insert(userId, {
                    name: params.name,
                    description: params.description,
                    start_date: params.start_date,
                    end_date: params.end_date,
                });
            } catch (error) {
                console.error(
                    'Failed to export event to Google Calendar (non-blocking):',
                    error,
                );
            }
        }

        return await this.eventRepository.create({
            ...params,
            google_event_id: googleEventId,
        });
    }
}

import {
    Event,
    CreateEventParams,
    UpdateEventParams,
} from '../entities/event.js';

export interface EventRepository {
    create(createEventParams: CreateEventParams): Promise<Event>;
    findById(eventId: string): Promise<Event | null>;
    findByUserId(userId: string): Promise<Event[]>;
    update(
        eventId: string,
        updateEventParams: UpdateEventParams,
    ): Promise<Event>;
    delete(eventId: string): Promise<Event>;
}

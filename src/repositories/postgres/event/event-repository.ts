import { eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { eventsTable } from '../../../db/postgres/schemas/index.js';
import { EventNotFoundError } from '../../../errors/event.js';
import {
    Event,
    CreateEventParams,
    UpdateEventParams,
    EventRepository,
} from '../../../domain/index.js';

export type { EventRepository };

export class PostgresEventRepository implements EventRepository {
    constructor(private readonly database: Database = db) {}

    async create(createEventParams: CreateEventParams): Promise<Event> {
        const [createdEvent] = await this.database
            .insert(eventsTable)
            .values({
                ...createEventParams,
                start_date: new Date(createEventParams.start_date),
                end_date: new Date(createEventParams.end_date),
            })
            .returning();

        return createdEvent;
    }

    async findById(eventId: string): Promise<Event | null> {
        const [event] = await this.database
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.id, eventId));

        return event || null;
    }

    async findByUserId(userId: string): Promise<Event[]> {
        return await this.database
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.user_id, userId));
    }

    async update(
        eventId: string,
        updateEventParams: UpdateEventParams,
    ): Promise<Event> {
        const [updatedEvent] = await this.database
            .update(eventsTable)
            .set({
                ...updateEventParams,
                start_date: updateEventParams.start_date
                    ? new Date(updateEventParams.start_date)
                    : undefined,
                end_date: updateEventParams.end_date
                    ? new Date(updateEventParams.end_date)
                    : undefined,
            })
            .where(eq(eventsTable.id, eventId))
            .returning();

        if (!updatedEvent) {
            throw new EventNotFoundError(eventId);
        }

        return updatedEvent;
    }

    async delete(eventId: string): Promise<Event> {
        const [deletedEvent] = await this.database
            .delete(eventsTable)
            .where(eq(eventsTable.id, eventId))
            .returning();

        if (!deletedEvent) {
            throw new EventNotFoundError(eventId);
        }

        return deletedEvent;
    }
}

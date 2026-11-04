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
                google_event_id: createEventParams.google_event_id ?? null,
            })
            .returning();

        return { ...createdEvent, user_id: createdEvent.created_by_user_id };
    }

    async findById(eventId: string): Promise<Event | null> {
        const [event] = await this.database
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.id, eventId));

        return event ? { ...event, user_id: event.created_by_user_id } : null;
    }

    async findByShopId(shopId: string): Promise<Event[]> {
        const events = await this.database
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.shop_id, shopId));

        return events.map((e) => ({ ...e, user_id: e.created_by_user_id }));
    }

    async findByUserId(userId: string): Promise<Event[]> {
        const events = await this.database
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.created_by_user_id, userId));

        return events.map((e) => ({ ...e, user_id: e.created_by_user_id }));
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

        return { ...updatedEvent, user_id: updatedEvent.created_by_user_id };
    }

    async delete(eventId: string): Promise<Event> {
        const [deletedEvent] = await this.database
            .delete(eventsTable)
            .where(eq(eventsTable.id, eventId))
            .returning();

        if (!deletedEvent) {
            throw new EventNotFoundError(eventId);
        }

        return { ...deletedEvent, user_id: deletedEvent.created_by_user_id };
    }
}

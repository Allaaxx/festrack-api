import { and, eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    eventsTable,
    EventTableSelect,
    usersTable,
    UserTableSelect,
} from '../../../db/postgres/schemas/index.js';
import { EventNotFoundError } from '../../../errors/event.js';
import {
    Event,
    CreateEventParams,
    UpdateEventParams,
    EventRepository,
} from '../../../domain/index.js';

export type { EventRepository };

function mapEvent(
    row: EventTableSelect,
    author?: UserTableSelect | null,
): Event {
    const mapped: Event = {
        ...row,
        user_id: row.created_by_user_id,
    };

    if (author) {
        mapped.author = {
            id: author.id,
            name: author.name,
            first_name: author.first_name,
            last_name: author.last_name,
            email: author.email,
            image: author.image ?? null,
        };
    }

    return mapped;
}

export class PostgresEventRepository implements EventRepository {
    constructor(private readonly database: Database = db) {}

    private selectEventsWithAuthor() {
        return this.database
            .select({
                event: eventsTable,
                author: usersTable,
            })
            .from(eventsTable)
            .leftJoin(
                usersTable,
                eq(eventsTable.created_by_user_id, usersTable.id),
            );
    }

    async create(createEventParams: CreateEventParams): Promise<Event> {
        const { tag, all_day, ...rest } = createEventParams;

        const [createdEvent] = await this.database
            .insert(eventsTable)
            .values({
                ...rest,
                tag: tag ?? null,
                all_day: all_day ?? false,
                start_date: new Date(createEventParams.start_date),
                end_date: new Date(createEventParams.end_date),
                google_event_id: createEventParams.google_event_id ?? null,
            })
            .returning();

        return (await this.findById(createdEvent.id)) ?? mapEvent(createdEvent);
    }

    async findById(eventId: string): Promise<Event | null> {
        const [row] = await this.selectEventsWithAuthor().where(
            eq(eventsTable.id, eventId),
        );

        return row ? mapEvent(row.event, row.author) : null;
    }

    async findByShopId(shopId: string): Promise<Event[]> {
        const rows = await this.selectEventsWithAuthor().where(
            eq(eventsTable.shop_id, shopId),
        );

        return rows.map((row) => mapEvent(row.event, row.author));
    }

    async findByUserId(userId: string): Promise<Event[]> {
        const rows = await this.selectEventsWithAuthor().where(
            eq(eventsTable.created_by_user_id, userId),
        );

        return rows.map((row) => mapEvent(row.event, row.author));
    }

    async update(
        eventId: string,
        updateEventParams: UpdateEventParams,
    ): Promise<Event> {
        const { tag, all_day, start_date, end_date, ...rest } =
            updateEventParams;

        const [updatedEvent] = await this.database
            .update(eventsTable)
            .set({
                ...rest,
                start_date: start_date ? new Date(start_date) : undefined,
                end_date: end_date ? new Date(end_date) : undefined,
                ...(tag !== undefined ? { tag: tag ?? null } : {}),
                ...(all_day !== undefined ? { all_day } : {}),
            })
            .where(eq(eventsTable.id, eventId))
            .returning();

        if (!updatedEvent) {
            throw new EventNotFoundError(eventId);
        }

        return (await this.findById(updatedEvent.id)) ?? mapEvent(updatedEvent);
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

    async reassignTag(
        shopId: string,
        fromSlug: string,
        toSlug: string | null,
    ): Promise<number> {
        const updated = await this.database
            .update(eventsTable)
            .set({ tag: toSlug })
            .where(
                and(
                    eq(eventsTable.shop_id, shopId),
                    eq(eventsTable.tag, fromSlug),
                ),
            )
            .returning();

        return updated.length;
    }
}

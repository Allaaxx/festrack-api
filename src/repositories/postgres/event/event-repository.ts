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
    extractCivilDate,
    normalizeAllDayDates,
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
        const isAllDay = all_day ?? false;
        const normalizedDates = isAllDay
            ? normalizeAllDayDates(
                  createEventParams.start_date,
                  createEventParams.end_date,
              )
            : {
                  start_date: createEventParams.start_date,
                  end_date: createEventParams.end_date,
              };

        const [createdEvent] = await this.database
            .insert(eventsTable)
            .values({
                ...rest,
                tag: tag ?? null,
                all_day: isAllDay,
                start_date: new Date(normalizedDates.start_date),
                end_date: new Date(normalizedDates.end_date),
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
        const normalizedStart =
            all_day === true && start_date
                ? `${extractCivilDate(start_date)}T00:00:00.000Z`
                : start_date;
        const normalizedEnd =
            all_day === true && end_date
                ? `${extractCivilDate(end_date)}T23:59:59.000Z`
                : end_date;

        const [updatedEvent] = await this.database
            .update(eventsTable)
            .set({
                ...rest,
                start_date: normalizedStart
                    ? new Date(normalizedStart)
                    : undefined,
                end_date: normalizedEnd ? new Date(normalizedEnd) : undefined,
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

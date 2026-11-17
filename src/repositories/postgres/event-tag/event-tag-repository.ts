import { and, eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { eventTagsTable } from '../../../db/postgres/schemas/index.js';
import { EventTagNotFoundError } from '../../../errors/index.js';
import {
    EventTag,
    CreateEventTagParams,
    EventTagRepository,
} from '../../../domain/index.js';

export type { EventTagRepository };

export class PostgresEventTagRepository implements EventTagRepository {
    constructor(private readonly database: Database = db) {}

    async create(params: CreateEventTagParams): Promise<EventTag> {
        const [tag] = await this.database
            .insert(eventTagsTable)
            .values({
                shop_id: params.shop_id,
                name: params.name,
                slug: params.slug,
                color: params.color,
            })
            .returning();

        return tag;
    }

    async findByShopId(shopId: string): Promise<EventTag[]> {
        return await this.database
            .select()
            .from(eventTagsTable)
            .where(eq(eventTagsTable.shop_id, shopId));
    }

    async findBySlug(shopId: string, slug: string): Promise<EventTag | null> {
        const [tag] = await this.database
            .select()
            .from(eventTagsTable)
            .where(
                and(
                    eq(eventTagsTable.shop_id, shopId),
                    eq(eventTagsTable.slug, slug),
                ),
            );

        return tag ?? null;
    }

    async findById(id: string, shopId: string): Promise<EventTag | null> {
        const [tag] = await this.database
            .select()
            .from(eventTagsTable)
            .where(
                and(
                    eq(eventTagsTable.id, id),
                    eq(eventTagsTable.shop_id, shopId),
                ),
            );

        return tag ?? null;
    }

    async delete(id: string, shopId: string): Promise<EventTag> {
        const [deletedTag] = await this.database
            .delete(eventTagsTable)
            .where(
                and(
                    eq(eventTagsTable.id, id),
                    eq(eventTagsTable.shop_id, shopId),
                ),
            )
            .returning();

        if (!deletedTag) {
            throw new EventTagNotFoundError(id);
        }

        return deletedTag;
    }
}

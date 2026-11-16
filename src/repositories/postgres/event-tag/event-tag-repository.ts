import { eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { eventTagsTable } from '../../../db/postgres/schemas/index.js';
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
                is_system: params.is_system ?? false,
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
}

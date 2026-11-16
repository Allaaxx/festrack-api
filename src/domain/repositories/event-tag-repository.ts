import { EventTag, CreateEventTagParams } from '../entities/event-tag.js';

export interface EventTagRepository {
    create(params: CreateEventTagParams): Promise<EventTag>;
    findByShopId(shopId: string): Promise<EventTag[]>;
    findBySlug(shopId: string, slug: string): Promise<EventTag | null>;
}

import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    EventTagConflictError,
    InvalidEventTagSlugError,
} from '../../errors/event-tag.js';
import {
    EventTag,
    EventTagRepository,
    ShopRepository,
    ShopMemberRepository,
} from '../../domain/index.js';

export interface CreateEventTagInput {
    shopId: string;
    userId: string;
    name: string;
    color: string;
    slug?: string;
}

function toKebabCase(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export class CreateEventTagUseCase {
    constructor(
        private readonly eventTagRepository: Pick<
            EventTagRepository,
            'create' | 'findBySlug'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(input: CreateEventTagInput): Promise<EventTag> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const member = await this.shopMemberRepository.findByShopAndUserId(
            input.shopId,
            input.userId,
        );
        if (!member) {
            throw new ForbiddenError();
        }

        const rawSlug =
            input.slug && input.slug.trim().length > 0
                ? input.slug
                : input.name;
        const slug = toKebabCase(rawSlug);

        if (slug.length === 0) {
            throw new InvalidEventTagSlugError();
        }

        const existingTag = await this.eventTagRepository.findBySlug(
            input.shopId,
            slug,
        );
        if (existingTag) {
            throw new EventTagConflictError(slug);
        }

        return await this.eventTagRepository.create({
            shop_id: input.shopId,
            name: input.name.trim(),
            slug,
            color: input.color.trim(),
        });
    }
}

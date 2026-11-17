import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    EventTagNotFoundError,
    CannotDeleteSystemTagError,
} from '../../errors/event-tag.js';
import {
    EventTag,
    EventTagRepository,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
    SYSTEM_EVENT_TAG_IDS,
    SYSTEM_EVENT_TAG_SLUGS,
    DEFAULT_EVENT_TAG_SLUG,
} from '../../domain/index.js';

export interface DeleteEventTagInput {
    shopId: string;
    tagId: string;
    userId: string;
}

export class DeleteEventTagUseCase {
    constructor(
        private readonly eventTagRepository: Pick<
            EventTagRepository,
            'findById' | 'delete'
        >,
        private readonly eventRepository: Pick<EventRepository, 'reassignTag'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(input: DeleteEventTagInput): Promise<EventTag> {
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

        if (
            SYSTEM_EVENT_TAG_IDS.has(input.tagId) ||
            SYSTEM_EVENT_TAG_SLUGS.has(input.tagId)
        ) {
            throw new CannotDeleteSystemTagError();
        }

        const tag = await this.eventTagRepository.findById(
            input.tagId,
            input.shopId,
        );
        if (!tag) {
            throw new EventTagNotFoundError(input.tagId);
        }

        if (tag.is_system) {
            throw new CannotDeleteSystemTagError();
        }

        await this.eventRepository.reassignTag(
            input.shopId,
            tag.slug,
            DEFAULT_EVENT_TAG_SLUG,
        );

        return await this.eventTagRepository.delete(input.tagId, input.shopId);
    }
}

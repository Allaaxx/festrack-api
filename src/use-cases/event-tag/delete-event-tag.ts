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
    SYSTEM_EVENT_TAG_SLUGS,
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
        private readonly eventRepository: Pick<
            EventRepository,
            'reassignTag'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(
        inputOrShopId: DeleteEventTagInput | string,
        maybeTagId?: string,
        maybeUserId?: string,
    ): Promise<EventTag> {
        let shopId: string;
        let tagId: string;
        let userId: string;

        if (typeof inputOrShopId === 'object') {
            shopId = inputOrShopId.shopId;
            tagId = inputOrShopId.tagId;
            userId = inputOrShopId.userId;
        } else {
            shopId = inputOrShopId;
            tagId = maybeTagId!;
            userId = maybeUserId!;
        }

        const shop = await this.shopRepository.findById(shopId);
        if (!shop) {
            throw new ShopNotFoundError(shopId);
        }

        const member = await this.shopMemberRepository.findByShopAndUserId(
            shopId,
            userId,
        );
        if (!member) {
            throw new ForbiddenError();
        }

        const isSystemId =
            tagId.startsWith('system-') ||
            (SYSTEM_EVENT_TAG_SLUGS as readonly string[]).includes(tagId);
        if (isSystemId) {
            throw new CannotDeleteSystemTagError();
        }

        const tag = await this.eventTagRepository.findById(tagId, shopId);
        if (!tag) {
            throw new EventTagNotFoundError(tagId);
        }

        if (tag.is_system) {
            throw new CannotDeleteSystemTagError();
        }

        await this.eventRepository.reassignTag(shopId, tag.slug, 'etc');

        return await this.eventTagRepository.delete(tagId, shopId);
    }
}

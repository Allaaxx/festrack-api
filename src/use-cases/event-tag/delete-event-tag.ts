import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { EventTagNotFoundError } from '../../errors/event-tag.js';
import {
    EventTag,
    EventTagRepository,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
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

        const tag = await this.eventTagRepository.findById(
            input.tagId,
            input.shopId,
        );
        if (!tag) {
            throw new EventTagNotFoundError(input.tagId);
        }

        await this.eventRepository.reassignTag(
            input.shopId,
            tag.slug,
            null,
        );

        return await this.eventTagRepository.delete(input.tagId, input.shopId);
    }
}

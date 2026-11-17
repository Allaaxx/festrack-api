import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    EventTag,
    EventTagRepository,
    ShopRepository,
    ShopMemberRepository,
    getSystemDefaultEventTags,
} from '../../domain/index.js';

export class GetEventTagsByShopIdUseCase {
    constructor(
        private readonly eventTagRepository: Pick<
            EventTagRepository,
            'findByShopId'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(shopId: string, userId: string): Promise<EventTag[]> {
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

        const systemTags = getSystemDefaultEventTags(shopId);
        const customTags = await this.eventTagRepository.findByShopId(shopId);

        return [...systemTags, ...customTags];
    }
}

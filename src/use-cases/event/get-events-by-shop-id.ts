import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    Event,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
} from '../../domain/index.js';

export class GetEventsByShopIdUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'findByShopId'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(shopId: string, userId: string): Promise<Event[]> {
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

        return await this.eventRepository.findByShopId(shopId);
    }
}

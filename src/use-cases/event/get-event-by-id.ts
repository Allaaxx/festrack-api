import { EventNotFoundError } from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    Event,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
} from '../../domain/index.js';

export class GetEventByIdUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'findById'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(
        shopId: string,
        eventId: string,
        userId: string,
    ): Promise<Event> {
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

        const event = await this.eventRepository.findById(eventId);
        if (!event || event.shop_id !== shopId) {
            throw new EventNotFoundError(eventId);
        }

        return event;
    }
}

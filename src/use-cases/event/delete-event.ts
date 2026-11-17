import { EventNotFoundError } from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    Event,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

export class DeleteEventUseCase {
    constructor(
        private readonly eventRepository: Pick<
            EventRepository,
            'findById' | 'delete'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId' | 'findOwnerByShopId'
        >,
        private readonly userRepository?: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<
            GoogleCalendarAdapter,
            'delete'
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

        if (
            event.google_event_id &&
            this.calendarAdapter &&
            this.userRepository
        ) {
            const ownerMember =
                member.role === 'OWNER'
                    ? member
                    : await this.shopMemberRepository.findOwnerByShopId(shopId);
            const owner = ownerMember
                ? await this.userRepository.findById(ownerMember.user_id)
                : null;

            if (owner?.google_calendar_sync_enabled) {
                try {
                    await this.calendarAdapter.delete(
                        owner.id,
                        event.google_event_id,
                    );
                } catch (error) {
                    console.error(
                        'Failed to delete event on Google Calendar (non-blocking):',
                        error,
                    );
                }
            }
        }

        return await this.eventRepository.delete(eventId);
    }
}

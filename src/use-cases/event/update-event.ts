import { EventNotFoundError } from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    Event,
    UpdateEventParams,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

export class UpdateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<
            EventRepository,
            'findById' | 'update'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly userRepository?: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<GoogleCalendarAdapter, 'patch'>,
    ) {}

    async execute(
        shopId: string,
        eventId: string,
        userId: string,
        updateParams: UpdateEventParams,
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
            const user = await this.userRepository.findById(userId);
            if (user?.google_calendar_sync_enabled) {
                try {
                    await this.calendarAdapter.patch(
                        userId,
                        event.google_event_id,
                        {
                            name: updateParams.name,
                            description: updateParams.description,
                            start_date: updateParams.start_date,
                            end_date: updateParams.end_date,
                        },
                    );
                } catch (error) {
                    console.error(
                        'Failed to patch event on Google Calendar (non-blocking):',
                        error,
                    );
                }
            }
        }

        return await this.eventRepository.update(eventId, updateParams);
    }
}

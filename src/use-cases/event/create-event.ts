import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { UserNotFoundError } from '../../errors/user.js';
import {
    Event,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

export interface CreateEventInput {
    shopId: string;
    userId: string;
    name: string;
    description?: string | null;
    start_date: Date | string;
    end_date: Date | string;
}

export class CreateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'create'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly userRepository?: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<
            GoogleCalendarAdapter,
            'insert'
        >,
    ) {}

    async execute(input: CreateEventInput): Promise<Event> {
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

        let googleEventId: string | null = null;
        if (this.userRepository && this.calendarAdapter) {
            const user = await this.userRepository.findById(input.userId);
            if (!user) {
                throw new UserNotFoundError(input.userId);
            }

            if (user.google_calendar_sync_enabled) {
                try {
                    googleEventId = await this.calendarAdapter.insert(
                        input.userId,
                        {
                            name: input.name,
                            description: input.description,
                            start_date: input.start_date,
                            end_date: input.end_date,
                        },
                    );
                } catch (error) {
                    console.error(
                        'Failed to export event to Google Calendar (non-blocking):',
                        error,
                    );
                }
            }
        }

        return await this.eventRepository.create({
            shop_id: input.shopId,
            created_by_user_id: input.userId,
            name: input.name,
            description: input.description,
            start_date: input.start_date,
            end_date: input.end_date,
            google_event_id: googleEventId,
        });
    }
}

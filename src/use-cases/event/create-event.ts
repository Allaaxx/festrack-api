import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    Event,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
    UserRepository,
    GoogleCalendarAdapter,
    normalizeAllDayDates,
} from '../../domain/index.js';
import { resolveShopOwner } from './resolve-shop-owner.js';

export interface CreateEventInput {
    shopId: string;
    userId: string;
    name: string;
    description?: string | null;
    start_date: Date | string;
    end_date: Date | string;
    tag?: string | null;
    all_day?: boolean;
}

export class CreateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<EventRepository, 'create'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId' | 'findOwnerByShopId'
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

        const allDay = input.all_day ?? false;
        const { start_date: normalizedStartDate, end_date: normalizedEndDate } =
            allDay
                ? normalizeAllDayDates(input.start_date, input.end_date)
                : {
                      start_date: input.start_date,
                      end_date: input.end_date,
                  };

        let googleEventId: string | null = null;
        if (this.userRepository && this.calendarAdapter) {
            const owner = await resolveShopOwner(
                input.shopId,
                member,
                this.shopMemberRepository,
                this.userRepository,
            );

            if (owner?.google_calendar_sync_enabled) {
                try {
                    googleEventId = await this.calendarAdapter.insert(
                        owner.id,
                        {
                            name: input.name,
                            description: input.description,
                            start_date: normalizedStartDate,
                            end_date: normalizedEndDate,
                            all_day: allDay,
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

        const tag =
            input.tag && input.tag.trim() !== '' ? input.tag.trim() : null;

        return await this.eventRepository.create({
            shop_id: input.shopId,
            created_by_user_id: input.userId,
            name: input.name,
            description: input.description,
            start_date: normalizedStartDate,
            end_date: normalizedEndDate,
            google_event_id: googleEventId,
            tag,
            all_day: allDay,
        });
    }
}

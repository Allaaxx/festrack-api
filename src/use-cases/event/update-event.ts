import {
    EventNotFoundError,
    GoogleCalendarNotFoundError,
    InvalidEventDateRangeError,
} from '../../errors/event.js';
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
    normalizeAllDayDates,
} from '../../domain/index.js';
import { resolveShopOwner } from './resolve-shop-owner.js';

export interface UpdateEventInput {
    name?: string;
    description?: string | null;
    start_date?: Date | string;
    end_date?: Date | string;
    google_event_id?: string | null;
    tag?: string | null;
    all_day?: boolean;
}

export class UpdateEventUseCase {
    constructor(
        private readonly eventRepository: Pick<
            EventRepository,
            'findById' | 'update'
        >,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId' | 'findOwnerByShopId'
        >,
        private readonly userRepository?: Pick<UserRepository, 'findById'>,
        private readonly calendarAdapter?: Pick<
            GoogleCalendarAdapter,
            'patch' | 'insert'
        >,
    ) {}

    async execute(
        shopId: string,
        eventId: string,
        userId: string,
        updateParams: UpdateEventInput,
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

        const updateData: UpdateEventParams = {
            ...updateParams,
        };

        const effectiveAllDay = updateParams.all_day ?? event.all_day;
        const shouldNormalizeDates =
            effectiveAllDay &&
            (updateParams.all_day === true ||
                updateParams.start_date !== undefined ||
                updateParams.end_date !== undefined);

        if (shouldNormalizeDates) {
            const normalized = normalizeAllDayDates(
                updateParams.start_date ?? event.start_date,
                updateParams.end_date ?? event.end_date,
            );
            if (
                updateParams.start_date !== undefined ||
                updateParams.all_day === true
            ) {
                updateData.start_date = normalized.start_date;
            }
            if (
                updateParams.end_date !== undefined ||
                updateParams.all_day === true
            ) {
                updateData.end_date = normalized.end_date;
            }
        }

        const effectiveStartDate = updateData.start_date ?? event.start_date;
        const effectiveEndDate = updateData.end_date ?? event.end_date;

        if (
            (updateParams.start_date !== undefined ||
                updateParams.end_date !== undefined ||
                shouldNormalizeDates) &&
            new Date(effectiveEndDate) < new Date(effectiveStartDate)
        ) {
            throw new InvalidEventDateRangeError();
        }

        if (this.calendarAdapter && this.userRepository) {
            const owner = await resolveShopOwner(
                shopId,
                member,
                this.shopMemberRepository,
                this.userRepository,
            );

            if (owner?.google_calendar_sync_enabled) {
                const insertOnOwnerCalendar = async () => {
                    try {
                        const insertedGoogleEventId =
                            await this.calendarAdapter!.insert(owner.id, {
                                name: updateParams.name ?? event.name,
                                description:
                                    updateParams.description !== undefined
                                        ? updateParams.description
                                        : event.description,
                                start_date:
                                    updateData.start_date ?? event.start_date,
                                end_date: updateData.end_date ?? event.end_date,
                            });
                        if (insertedGoogleEventId) {
                            updateData.google_event_id = insertedGoogleEventId;
                        }
                    } catch (insertError) {
                        console.error(
                            'Failed to insert fallback event on Google Calendar (non-blocking):',
                            insertError,
                        );
                    }
                };

                if (!event.google_event_id) {
                    await insertOnOwnerCalendar();
                } else {
                    try {
                        await this.calendarAdapter.patch(
                            owner.id,
                            event.google_event_id,
                            {
                                name: updateParams.name,
                                description: updateParams.description,
                                start_date: updateData.start_date,
                                end_date: updateData.end_date,
                            },
                        );
                    } catch (error) {
                        const status = (error as { status?: number })?.status;
                        if (
                            error instanceof GoogleCalendarNotFoundError ||
                            status === 404 ||
                            status === 410
                        ) {
                            await insertOnOwnerCalendar();
                        } else {
                            console.error(
                                'Failed to patch event on Google Calendar (non-blocking):',
                                error,
                            );
                        }
                    }
                }
            }
        }
        if (updateParams.tag !== undefined) {
            updateData.tag =
                updateParams.tag && updateParams.tag.trim() !== ''
                    ? updateParams.tag.trim()
                    : null;
        }

        return await this.eventRepository.update(eventId, updateData);
    }
}

import {
    EventNotFoundError,
    GoogleCalendarNotFoundError,
} from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    Event,
    UpdateEventParams,
    EventRepository,
    ShopRepository,
    ShopMember,
    ShopMemberRepository,
    UserRepository,
    GoogleCalendarAdapter,
    resolveEventDateRange,
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

interface ResolvedEventSchedule {
    effectiveAllDay: boolean;
    effectiveStartDate: Date | string;
    effectiveEndDate: Date | string;
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

        const updateData: UpdateEventParams = { ...updateParams };
        const schedule = this.resolveScheduleUpdate(
            event,
            updateParams,
            updateData,
        );

        await this.syncGoogleCalendar(
            shopId,
            member,
            event,
            updateParams,
            updateData,
            schedule,
        );

        if (updateParams.tag !== undefined) {
            updateData.tag =
                updateParams.tag && updateParams.tag.trim() !== ''
                    ? updateParams.tag.trim()
                    : null;
        }

        return await this.eventRepository.update(eventId, updateData);
    }

    private resolveScheduleUpdate(
        event: Event,
        updateParams: UpdateEventInput,
        updateData: UpdateEventParams,
    ): ResolvedEventSchedule {
        const effectiveAllDay = updateParams.all_day ?? event.all_day;
        const hasDateOrModeUpdate =
            updateParams.all_day !== undefined ||
            updateParams.start_date !== undefined ||
            updateParams.end_date !== undefined;

        if (!hasDateOrModeUpdate) {
            return {
                effectiveAllDay,
                effectiveStartDate: event.start_date,
                effectiveEndDate: event.end_date,
            };
        }

        const resolved = resolveEventDateRange(
            updateParams.start_date ?? event.start_date,
            updateParams.end_date ?? event.end_date,
            effectiveAllDay,
        );

        if (effectiveAllDay) {
            if (
                updateParams.start_date !== undefined ||
                updateParams.all_day === true
            ) {
                updateData.start_date = resolved.start_date;
            }
            if (
                updateParams.end_date !== undefined ||
                updateParams.all_day === true
            ) {
                updateData.end_date = resolved.end_date;
            }
        }

        return {
            effectiveAllDay,
            effectiveStartDate: resolved.start_date,
            effectiveEndDate: resolved.end_date,
        };
    }

    private async syncGoogleCalendar(
        shopId: string,
        member: ShopMember,
        event: Event,
        updateParams: UpdateEventInput,
        updateData: UpdateEventParams,
        schedule: ResolvedEventSchedule,
    ): Promise<void> {
        if (!this.calendarAdapter || !this.userRepository) {
            return;
        }

        const owner = await resolveShopOwner(
            shopId,
            member,
            this.shopMemberRepository,
            this.userRepository,
        );
        if (!owner?.google_calendar_sync_enabled) {
            return;
        }

        if (!event.google_event_id) {
            const insertedId = await this.insertFallbackCalendarEvent(
                owner.id,
                event,
                updateParams,
                schedule,
            );
            if (insertedId) {
                updateData.google_event_id = insertedId;
            }
            return;
        }

        const hasExplicitAllDayFlag = updateParams.all_day !== undefined;
        const hasPatchedDates =
            hasExplicitAllDayFlag ||
            updateData.start_date !== undefined ||
            updateData.end_date !== undefined;

        try {
            await this.calendarAdapter.patch(owner.id, event.google_event_id, {
                name: updateParams.name,
                description: updateParams.description,
                start_date: hasExplicitAllDayFlag
                    ? schedule.effectiveStartDate
                    : updateData.start_date,
                end_date: hasExplicitAllDayFlag
                    ? schedule.effectiveEndDate
                    : updateData.end_date,
                all_day: hasPatchedDates ? schedule.effectiveAllDay : undefined,
            });
        } catch (error) {
            const status = (error as { status?: number })?.status;
            if (
                error instanceof GoogleCalendarNotFoundError ||
                status === 404 ||
                status === 410
            ) {
                const insertedId = await this.insertFallbackCalendarEvent(
                    owner.id,
                    event,
                    updateParams,
                    schedule,
                );
                if (insertedId) {
                    updateData.google_event_id = insertedId;
                }
            } else {
                console.error(
                    'Failed to patch event on Google Calendar (non-blocking):',
                    error,
                );
            }
        }
    }

    private async insertFallbackCalendarEvent(
        ownerId: string,
        event: Event,
        updateParams: UpdateEventInput,
        schedule: ResolvedEventSchedule,
    ): Promise<string | null> {
        try {
            return await this.calendarAdapter!.insert(ownerId, {
                name: updateParams.name ?? event.name,
                description:
                    updateParams.description !== undefined
                        ? updateParams.description
                        : event.description,
                start_date: schedule.effectiveStartDate,
                end_date: schedule.effectiveEndDate,
                all_day: schedule.effectiveAllDay,
            });
        } catch (insertError) {
            console.error(
                'Failed to insert fallback event on Google Calendar (non-blocking):',
                insertError,
            );
            return null;
        }
    }
}

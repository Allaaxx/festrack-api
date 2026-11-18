import {
    EventNotFoundError,
    GoogleCalendarNotFoundError,
    InvalidEventDateRangeError,
} from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user, shop } from '../../tests/index.js';
import { UpdateEventUseCase } from './update-event.js';
import {
    Event,
    UpdateEventParams,
    EventRepository,
    Shop,
    ShopRepository,
    ShopMember,
    ShopMemberRepository,
    User,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

describe('Update Event Use Case', () => {
    const updateParams: UpdateEventParams = {
        name: 'Updated Event Name',
    };

    class EventRepositoryStub implements Pick<
        EventRepository,
        'findById' | 'update'
    > {
        async findById(_id: string): Promise<Event | null> {
            return {
                ...event,
                shop_id: shop.id,
                created_by_user_id: user.id,
            };
        }

        async update(
            _eventId: string,
            updateEventParams: UpdateEventParams,
        ): Promise<Event> {
            return {
                ...event,
                shop_id: shop.id,
                created_by_user_id: user.id,
                ...updateEventParams,
            };
        }
    }

    class ShopRepositoryStub implements Pick<ShopRepository, 'findById'> {
        async findById(_id: string): Promise<Shop | null> {
            return shop;
        }
    }

    class ShopMemberRepositoryStub implements Pick<
        ShopMemberRepository,
        'findByShopAndUserId' | 'findOwnerByShopId'
    > {
        async findByShopAndUserId(
            _shopId: string,
            _userId: string,
        ): Promise<ShopMember | null> {
            return {
                id: 'member-1',
                shop_id: shop.id,
                user_id: user.id,
                role: 'MEMBER',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }

        async findOwnerByShopId(_shopId: string): Promise<ShopMember | null> {
            return {
                id: 'owner-member-1',
                shop_id: shop.id,
                user_id: user.id,
                role: 'OWNER',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }
    }

    class UserRepositoryStub implements Pick<UserRepository, 'findById'> {
        async findById(_id: string): Promise<User | null> {
            return user;
        }
    }

    class CalendarAdapterStub implements Pick<
        GoogleCalendarAdapter,
        'patch' | 'insert'
    > {
        async patch(): Promise<void> {}
        async insert(): Promise<string> {
            return 'google-event-fallback-123';
        }
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const shopRepository = new ShopRepositoryStub();
        const shopMemberRepository = new ShopMemberRepositoryStub();
        const userRepository = new UserRepositoryStub();
        const calendarAdapter = new CalendarAdapterStub();
        const sut = new UpdateEventUseCase(
            eventRepository,
            shopRepository,
            shopMemberRepository,
            userRepository,
            calendarAdapter,
        );

        return {
            sut,
            eventRepository,
            shopRepository,
            shopMemberRepository,
            userRepository,
            calendarAdapter,
        };
    };

    it('should update event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(
            shop.id,
            event.id,
            user.id,
            updateParams,
        );

        expect(result.name).toBe(updateParams.name!);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const { sut, shopRepository } = makeSut();
        jest.spyOn(shopRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new ShopNotFoundError(shop.id));
    });

    it('should throw ForbiddenError if user is not a shop member', async () => {
        const { sut, shopMemberRepository } = makeSut();
        jest.spyOn(
            shopMemberRepository,
            'findByShopAndUserId',
        ).mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw EventNotFoundError if event belongs to another shop', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: 'other-shop-id',
            created_by_user_id: user.id,
        });

        const promise = sut.execute(shop.id, event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should patch Google Calendar event when sync is enabled and event has google_event_id', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'gcal-patch-123',
        });
        const patchSpy = jest.spyOn(calendarAdapter, 'patch');

        await sut.execute(shop.id, event.id, user.id, updateParams);

        expect(patchSpy).toHaveBeenCalledWith(
            user.id,
            'gcal-patch-123',
            expect.objectContaining({ name: updateParams.name }),
        );
    });

    it('should tolerate Google Calendar patch failure and still update event (non-blocking resilience)', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'gcal-patch-123',
        });
        jest.spyOn(calendarAdapter, 'patch').mockRejectedValueOnce(
            new Error('Patch failed'),
        );

        const result = await sut.execute(
            shop.id,
            event.id,
            user.id,
            updateParams,
        );

        expect(result).toBeDefined();
        expect(result.name).toBe(updateParams.name!);
    });

    it('should pass tag to eventRepository.update', async () => {
        const { sut, eventRepository } = makeSut();
        const updateSpy = jest.spyOn(eventRepository, 'update');

        await sut.execute(shop.id, event.id, user.id, {
            tag: 'custom-tag',
        });

        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                tag: 'custom-tag',
            }),
        );
    });

    it('should patch Google Calendar event on Shop OWNER account when a MEMBER updates an event', async () => {
        const {
            sut,
            shopMemberRepository,
            userRepository,
            eventRepository,
            calendarAdapter,
        } = makeSut();
        const memberUserId = 'member-user-id';
        const ownerUserId = 'owner-user-id';

        jest.spyOn(
            shopMemberRepository,
            'findByShopAndUserId',
        ).mockResolvedValueOnce({
            id: 'member-2',
            shop_id: shop.id,
            user_id: memberUserId,
            role: 'MEMBER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        jest.spyOn(
            shopMemberRepository,
            'findOwnerByShopId',
        ).mockResolvedValueOnce({
            id: 'member-1',
            shop_id: shop.id,
            user_id: ownerUserId,
            role: 'OWNER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        jest.spyOn(userRepository, 'findById').mockImplementation(
            async (id: string) => ({
                ...user,
                id,
                google_calendar_sync_enabled: id === ownerUserId,
            }),
        );
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: memberUserId,
            google_event_id: 'gcal-owner-patch-123',
        });
        const patchSpy = jest.spyOn(calendarAdapter, 'patch');

        await sut.execute(shop.id, event.id, memberUserId, updateParams);

        expect(patchSpy).toHaveBeenCalledWith(
            ownerUserId,
            'gcal-owner-patch-123',
            expect.objectContaining({ name: updateParams.name }),
        );
    });

    it('should fall back to insert on Shop OWNER Google Calendar and persist google_event_id when event lacks google_event_id', async () => {
        const {
            sut,
            shopMemberRepository,
            userRepository,
            eventRepository,
            calendarAdapter,
        } = makeSut();
        const ownerUserId = 'owner-user-id';

        jest.spyOn(
            shopMemberRepository,
            'findOwnerByShopId',
        ).mockResolvedValueOnce({
            id: 'member-1',
            shop_id: shop.id,
            user_id: ownerUserId,
            role: 'OWNER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            id: ownerUserId,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: null,
        });
        const patchSpy = jest.spyOn(calendarAdapter, 'patch');
        const insertSpy = jest
            .spyOn(calendarAdapter, 'insert')
            .mockResolvedValueOnce('new-gcal-id-1');
        const updateSpy = jest.spyOn(eventRepository, 'update');

        await sut.execute(shop.id, event.id, user.id, { name: 'Updated Name' });

        expect(patchSpy).not.toHaveBeenCalled();
        expect(insertSpy).toHaveBeenCalledWith(
            ownerUserId,
            expect.objectContaining({
                name: 'Updated Name',
                description: event.description,
                start_date: event.start_date,
                end_date: event.end_date,
            }),
        );
        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                name: 'Updated Name',
                google_event_id: 'new-gcal-id-1',
            }),
        );
    });

    it('should fall back to insert on Shop OWNER Google Calendar and persist new google_event_id when patch throws GoogleCalendarNotFoundError', async () => {
        const {
            sut,
            shopMemberRepository,
            userRepository,
            eventRepository,
            calendarAdapter,
        } = makeSut();
        const ownerUserId = 'owner-user-id';

        jest.spyOn(
            shopMemberRepository,
            'findOwnerByShopId',
        ).mockResolvedValueOnce({
            id: 'member-1',
            shop_id: shop.id,
            user_id: ownerUserId,
            role: 'OWNER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            id: ownerUserId,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'stale-gcal-id',
        });
        jest.spyOn(calendarAdapter, 'patch').mockRejectedValueOnce(
            new GoogleCalendarNotFoundError(404),
        );
        const insertSpy = jest
            .spyOn(calendarAdapter, 'insert')
            .mockResolvedValueOnce('recreated-gcal-id-2');
        const updateSpy = jest.spyOn(eventRepository, 'update');

        await sut.execute(shop.id, event.id, user.id, { name: 'Recreated' });

        expect(insertSpy).toHaveBeenCalledWith(
            ownerUserId,
            expect.objectContaining({
                name: 'Recreated',
                description: event.description,
                start_date: event.start_date,
                end_date: event.end_date,
            }),
        );
        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                name: 'Recreated',
                google_event_id: 'recreated-gcal-id-2',
            }),
        );
    });

    it('should tolerate fallback insert failure and still update event (non-blocking resilience)', async () => {
        const {
            sut,
            shopMemberRepository,
            userRepository,
            eventRepository,
            calendarAdapter,
        } = makeSut();

        jest.spyOn(
            shopMemberRepository,
            'findOwnerByShopId',
        ).mockResolvedValueOnce({
            id: 'member-1',
            shop_id: shop.id,
            user_id: user.id,
            role: 'OWNER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: null,
        });
        jest.spyOn(calendarAdapter, 'insert').mockRejectedValueOnce(
            new Error('Insert failed'),
        );

        const result = await sut.execute(
            shop.id,
            event.id,
            user.id,
            updateParams,
        );

        expect(result).toBeDefined();
        expect(result.name).toBe(updateParams.name!);
    });

    it('should switch timed event to all_day: true without new dates and normalize existing bounds', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: false,
            start_date: new Date('2026-11-18T14:00:00.000Z'),
            end_date: new Date('2026-11-19T18:30:00.000Z'),
        });
        const updateSpy = jest.spyOn(eventRepository, 'update');

        const result = await sut.execute(shop.id, event.id, user.id, {
            all_day: true,
        });

        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-19T23:59:59.000Z',
            }),
        );
        expect(result.all_day).toBe(true);
    });

    it('should switch timed event to all_day: true with new offset dates and normalize civil-date bounds', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: false,
        });
        const updateSpy = jest.spyOn(eventRepository, 'update');

        const result = await sut.execute(shop.id, event.id, user.id, {
            all_day: true,
            start_date: '2026-11-18T00:00:00-03:00',
            end_date: '2026-11-18T23:59:59-03:00',
        });

        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-18T23:59:59.000Z',
            }),
        );
        expect(result.all_day).toBe(true);
    });

    it('should switch all_day event to all_day: false with new timed dates preserving instants', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: true,
            start_date: new Date('2026-11-18T00:00:00.000Z'),
            end_date: new Date('2026-11-18T23:59:59.000Z'),
        });
        const updateSpy = jest.spyOn(eventRepository, 'update');

        const result = await sut.execute(shop.id, event.id, user.id, {
            all_day: false,
            start_date: '2026-11-18T14:00:00-03:00',
            end_date: '2026-11-18T16:00:00-03:00',
        });

        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                all_day: false,
                start_date: '2026-11-18T14:00:00-03:00',
                end_date: '2026-11-18T16:00:00-03:00',
            }),
        );
        expect(result.all_day).toBe(false);
    });

    it('should normalize updated start_date when event is already all_day: true', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: true,
            start_date: new Date('2026-11-18T00:00:00.000Z'),
            end_date: new Date('2026-11-20T23:59:59.000Z'),
        });
        const updateSpy = jest.spyOn(eventRepository, 'update');

        await sut.execute(shop.id, event.id, user.id, {
            start_date: '2026-11-19',
        });

        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                start_date: '2026-11-19T00:00:00.000Z',
            }),
        );
    });

    it('should throw InvalidEventDateRangeError when updated end_date is before start_date', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: true,
            start_date: new Date('2026-11-18T00:00:00.000Z'),
            end_date: new Date('2026-11-18T23:59:59.000Z'),
        });

        const promise = sut.execute(shop.id, event.id, user.id, {
            start_date: '2026-11-20',
        });

        await expect(promise).rejects.toThrow(new InvalidEventDateRangeError());
    });

    it('should allow and normalize same-day offset timestamps on an existing all-day event when all_day is omitted', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: true,
            start_date: new Date('2026-11-17T00:00:00.000Z'),
            end_date: new Date('2026-11-17T23:59:59.000Z'),
        });
        const updateSpy = jest.spyOn(eventRepository, 'update');

        const result = await sut.execute(shop.id, event.id, user.id, {
            start_date: '2026-11-18T22:00:00-03:00',
            end_date: '2026-11-18T10:00:00Z',
        });

        expect(updateSpy).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-18T23:59:59.000Z',
            }),
        );
        expect(result.start_date).toBe('2026-11-18T00:00:00.000Z');
        expect(result.end_date).toBe('2026-11-18T23:59:59.000Z');
    });

    it('should throw InvalidEventDateRangeError when updated date is a non-existent calendar date', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            all_day: false,
        });

        const promise = sut.execute(shop.id, event.id, user.id, {
            start_date: '2026-02-30',
        });

        await expect(promise).rejects.toThrow(InvalidEventDateRangeError);
    });

    it('should forward all_day: true and normalized bounds to Google Calendar patch when switching timed event to all-day without dates', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'gcal-switch-to-all-day',
            all_day: false,
            start_date: new Date('2026-11-18T14:00:00.000Z'),
            end_date: new Date('2026-11-19T18:30:00.000Z'),
        });
        const patchSpy = jest.spyOn(calendarAdapter, 'patch');

        await sut.execute(shop.id, event.id, user.id, {
            all_day: true,
        });

        expect(patchSpy).toHaveBeenCalledWith(
            user.id,
            'gcal-switch-to-all-day',
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-19T23:59:59.000Z',
            }),
        );
    });

    it('should forward all_day: false and existing bounds to Google Calendar patch when switching all-day event to timed without dates', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        const existingStart = new Date('2026-11-18T00:00:00.000Z');
        const existingEnd = new Date('2026-11-18T23:59:59.000Z');
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'gcal-switch-to-timed',
            all_day: true,
            start_date: existingStart,
            end_date: existingEnd,
        });
        const patchSpy = jest.spyOn(calendarAdapter, 'patch');

        await sut.execute(shop.id, event.id, user.id, {
            all_day: false,
        });

        expect(patchSpy).toHaveBeenCalledWith(
            user.id,
            'gcal-switch-to-timed',
            expect.objectContaining({
                all_day: false,
                start_date: existingStart,
                end_date: existingEnd,
            }),
        );
    });

    it('should forward all_day: true to Google Calendar patch when updating dates of an existing all-day event without all_day in payload', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'gcal-existing-all-day',
            all_day: true,
            start_date: new Date('2026-11-18T00:00:00.000Z'),
            end_date: new Date('2026-11-20T23:59:59.000Z'),
        });
        const patchSpy = jest.spyOn(calendarAdapter, 'patch');

        await sut.execute(shop.id, event.id, user.id, {
            start_date: '2026-11-19',
        });

        expect(patchSpy).toHaveBeenCalledWith(
            user.id,
            'gcal-existing-all-day',
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-19T00:00:00.000Z',
            }),
        );
    });

    it('should forward all_day: effectiveAllDay and effective dates on fallback insert when google_event_id is missing', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: null,
            all_day: false,
            start_date: new Date('2026-11-18T14:00:00.000Z'),
            end_date: new Date('2026-11-18T18:00:00.000Z'),
        });
        const insertSpy = jest.spyOn(calendarAdapter, 'insert');

        await sut.execute(shop.id, event.id, user.id, {
            all_day: true,
        });

        expect(insertSpy).toHaveBeenCalledWith(
            user.id,
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-18T23:59:59.000Z',
            }),
        );
    });

    it('should preserve existing event.all_day on fallback insert when patch returns 404 and all_day is omitted', async () => {
        const { sut, userRepository, eventRepository, calendarAdapter } =
            makeSut();
        const existingStart = new Date('2026-11-18T00:00:00.000Z');
        const existingEnd = new Date('2026-11-18T23:59:59.000Z');
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
            google_event_id: 'stale-all-day-gcal-id',
            all_day: true,
            start_date: existingStart,
            end_date: existingEnd,
        });
        jest.spyOn(calendarAdapter, 'patch').mockRejectedValueOnce(
            new GoogleCalendarNotFoundError(404),
        );
        const insertSpy = jest.spyOn(calendarAdapter, 'insert');

        await sut.execute(shop.id, event.id, user.id, {
            name: 'Recreated All-Day Event',
        });

        expect(insertSpy).toHaveBeenCalledWith(
            user.id,
            expect.objectContaining({
                name: 'Recreated All-Day Event',
                all_day: true,
                start_date: existingStart,
                end_date: existingEnd,
            }),
        );
    });
});

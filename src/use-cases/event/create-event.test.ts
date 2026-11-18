import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user, shop } from '../../tests/index.js';
import { CreateEventUseCase, CreateEventInput } from './create-event.js';
import {
    Event,
    CreateEventParams,
    EventRepository,
    Shop,
    ShopRepository,
    ShopMember,
    ShopMemberRepository,
    User,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

describe('Create Event Use Case', () => {
    const createEventInput: CreateEventInput = {
        shopId: shop.id,
        userId: user.id,
        name: event.name,
        description: event.description,
        start_date: event.start_date,
        end_date: event.end_date,
    };

    class EventRepositoryStub implements Pick<EventRepository, 'create'> {
        async create(params: CreateEventParams): Promise<Event> {
            return {
                ...event,
                ...params,
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
                role: 'OWNER',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }

        async findOwnerByShopId(_shopId: string): Promise<ShopMember | null> {
            return {
                id: 'member-1',
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

    class CalendarAdapterStub implements Pick<GoogleCalendarAdapter, 'insert'> {
        async insert(): Promise<string> {
            return 'google-event-id-123';
        }
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const shopRepository = new ShopRepositoryStub();
        const shopMemberRepository = new ShopMemberRepositoryStub();
        const userRepository = new UserRepositoryStub();
        const calendarAdapter = new CalendarAdapterStub();
        const sut = new CreateEventUseCase(
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

    it('should create event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(createEventInput);

        expect(result.shop_id).toBe(createEventInput.shopId);
        expect(result.created_by_user_id).toBe(createEventInput.userId);
        expect(result.name).toBe(createEventInput.name);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const { sut, shopRepository } = makeSut();
        jest.spyOn(shopRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(createEventInput);

        await expect(promise).rejects.toThrow(
            new ShopNotFoundError(createEventInput.shopId),
        );
    });

    it('should throw ForbiddenError if user is not a member of shop', async () => {
        const { sut, shopMemberRepository } = makeSut();
        jest.spyOn(
            shopMemberRepository,
            'findByShopAndUserId',
        ).mockResolvedValueOnce(null);

        const promise = sut.execute(createEventInput);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should call EventRepository.create with correct shop_id and created_by_user_id', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute(createEventInput);

        expect(createSpy).toHaveBeenCalledWith({
            shop_id: createEventInput.shopId,
            created_by_user_id: createEventInput.userId,
            name: createEventInput.name,
            description: createEventInput.description,
            start_date: createEventInput.start_date,
            end_date: createEventInput.end_date,
            google_event_id: null,
            tag: null,
            all_day: false,
        });
    });

    it('should pass all_day: true and normalize start_date and end_date to UTC civil-date bounds', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        const result = await sut.execute({
            ...createEventInput,
            start_date: '2026-11-18T00:00:00-03:00',
            end_date: '2026-11-18T23:59:59-03:00',
            all_day: true,
        });

        expect(result.all_day).toBe(true);
        expect(result.start_date).toBe('2026-11-18T00:00:00.000Z');
        expect(result.end_date).toBe('2026-11-18T23:59:59.000Z');
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-18T23:59:59.000Z',
            }),
        );
    });

    it('should normalize multi-day civil dates when all_day is true', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        const result = await sut.execute({
            ...createEventInput,
            start_date: '2026-11-18',
            end_date: '2026-11-20',
            all_day: true,
        });

        expect(result.all_day).toBe(true);
        expect(result.start_date).toBe('2026-11-18T00:00:00.000Z');
        expect(result.end_date).toBe('2026-11-20T23:59:59.000Z');
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                all_day: true,
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-20T23:59:59.000Z',
            }),
        );
    });

    it('should preserve raw timestamps and all_day: false for a 00:00-23:59 timed event', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        const result = await sut.execute({
            ...createEventInput,
            start_date: '2026-11-18T00:00:00-03:00',
            end_date: '2026-11-18T23:59:59-03:00',
            all_day: false,
        });

        expect(result.all_day).toBe(false);
        expect(result.start_date).toBe('2026-11-18T00:00:00-03:00');
        expect(result.end_date).toBe('2026-11-18T23:59:59-03:00');
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                all_day: false,
                start_date: '2026-11-18T00:00:00-03:00',
                end_date: '2026-11-18T23:59:59-03:00',
            }),
        );
    });

    it('should export event to Google Calendar and persist google_event_id when sync is enabled', async () => {
        const { sut, userRepository, eventRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute(createEventInput);

        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                google_event_id: 'google-event-id-123',
            }),
        );
    });

    it('should bypass Google Calendar export when sync is disabled', async () => {
        const { sut, userRepository, calendarAdapter } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: false,
        });
        const insertSpy = jest.spyOn(calendarAdapter, 'insert');

        await sut.execute(createEventInput);

        expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should tolerate Google Calendar failure and still create event (non-blocking resilience)', async () => {
        const { sut, userRepository, calendarAdapter, eventRepository } =
            makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce({
            ...user,
            google_calendar_sync_enabled: true,
        });
        jest.spyOn(calendarAdapter, 'insert').mockRejectedValueOnce(
            new Error('API failure'),
        );
        const createSpy = jest.spyOn(eventRepository, 'create');

        const result = await sut.execute(createEventInput);

        expect(result).toBeDefined();
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                google_event_id: null,
            }),
        );
    });

    it('should pass explicit tag to eventRepository.create', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute({
            ...createEventInput,
            tag: 'business',
        });

        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                tag: 'business',
            }),
        );
    });

    it('should default tag to null if tag is undefined, null, empty string, or whitespace', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute({
            ...createEventInput,
            tag: undefined,
        });
        expect(createSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({
                tag: null,
            }),
        );

        await sut.execute({
            ...createEventInput,
            tag: null,
        });
        expect(createSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({
                tag: null,
            }),
        );

        await sut.execute({
            ...createEventInput,
            tag: '',
        });
        expect(createSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({
                tag: null,
            }),
        );

        await sut.execute({
            ...createEventInput,
            tag: '   ',
        });
        expect(createSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({
                tag: null,
            }),
        );
    });

    it('should trim tag if non-empty string provided', async () => {
        const { sut, eventRepository } = makeSut();
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute({
            ...createEventInput,
            tag: '  business  ',
        });

        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                tag: 'business',
            }),
        );
    });

    it('should sync Google Calendar against the Shop OWNER when a MEMBER creates an event', async () => {
        const {
            sut,
            shopMemberRepository,
            userRepository,
            calendarAdapter,
            eventRepository,
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
        const insertSpy = jest.spyOn(calendarAdapter, 'insert');
        const createSpy = jest.spyOn(eventRepository, 'create');

        await sut.execute({
            ...createEventInput,
            userId: memberUserId,
        });

        expect(insertSpy).toHaveBeenCalledWith(
            ownerUserId,
            expect.objectContaining({ name: createEventInput.name }),
        );
        expect(createSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                created_by_user_id: memberUserId,
                google_event_id: 'google-event-id-123',
            }),
        );
    });

    it('should not sync Google Calendar when MEMBER has sync enabled but Shop OWNER has sync disabled', async () => {
        const { sut, shopMemberRepository, userRepository, calendarAdapter } =
            makeSut();
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
                google_calendar_sync_enabled: id === memberUserId,
            }),
        );
        const insertSpy = jest.spyOn(calendarAdapter, 'insert');

        await sut.execute({
            ...createEventInput,
            userId: memberUserId,
        });

        expect(insertSpy).not.toHaveBeenCalled();
    });
});

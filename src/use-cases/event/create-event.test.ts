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
        'findByShopAndUserId'
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
        });
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
});

import { EventNotFoundError } from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user, shop } from '../../tests/index.js';
import { DeleteEventUseCase } from './delete-event.js';
import {
    Event,
    EventRepository,
    Shop,
    ShopRepository,
    ShopMember,
    ShopMemberRepository,
    User,
    UserRepository,
    GoogleCalendarAdapter,
} from '../../domain/index.js';

describe('Delete Event Use Case', () => {
    class EventRepositoryStub implements Pick<
        EventRepository,
        'findById' | 'delete'
    > {
        async findById(_id: string): Promise<Event | null> {
            return {
                ...event,
                shop_id: shop.id,
                created_by_user_id: user.id,
            };
        }

        async delete(_id: string): Promise<Event> {
            return {
                ...event,
                shop_id: shop.id,
                created_by_user_id: user.id,
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
                role: 'MEMBER',
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

    class CalendarAdapterStub implements Pick<GoogleCalendarAdapter, 'delete'> {
        async delete(): Promise<void> {}
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const shopRepository = new ShopRepositoryStub();
        const shopMemberRepository = new ShopMemberRepositoryStub();
        const userRepository = new UserRepositoryStub();
        const calendarAdapter = new CalendarAdapterStub();
        const sut = new DeleteEventUseCase(
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

    it('should delete event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(shop.id, event.id, user.id);

        expect(result.id).toBe(event.id);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const { sut, shopRepository } = makeSut();
        jest.spyOn(shopRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, event.id, user.id);

        await expect(promise).rejects.toThrow(new ShopNotFoundError(shop.id));
    });

    it('should throw ForbiddenError if user is not a shop member', async () => {
        const { sut, shopMemberRepository } = makeSut();
        jest.spyOn(
            shopMemberRepository,
            'findByShopAndUserId',
        ).mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, event.id, user.id);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, event.id, user.id);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw EventNotFoundError if event belongs to another shop', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            shop_id: 'other-shop-id',
            created_by_user_id: user.id,
        });

        const promise = sut.execute(shop.id, event.id, user.id);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should delete Google Calendar event when sync is enabled and event has google_event_id', async () => {
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
            google_event_id: 'gcal-del-123',
        });
        const delSpy = jest.spyOn(calendarAdapter, 'delete');

        await sut.execute(shop.id, event.id, user.id);

        expect(delSpy).toHaveBeenCalledWith(user.id, 'gcal-del-123');
    });

    it('should tolerate Google Calendar delete failure and still delete event (non-blocking resilience)', async () => {
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
            google_event_id: 'gcal-del-123',
        });
        jest.spyOn(calendarAdapter, 'delete').mockRejectedValueOnce(
            new Error('Delete failed'),
        );

        const result = await sut.execute(shop.id, event.id, user.id);

        expect(result).toBeDefined();
        expect(result.id).toBe(event.id);
    });
});

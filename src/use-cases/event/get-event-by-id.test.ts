import { EventNotFoundError } from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user, shop } from '../../tests/index.js';
import { GetEventByIdUseCase } from './get-event-by-id.js';
import {
    Event,
    EventRepository,
    Shop,
    ShopRepository,
    ShopMember,
    ShopMemberRepository,
} from '../../domain/index.js';

describe('Get Event By Id Use Case', () => {
    class EventRepositoryStub implements Pick<EventRepository, 'findById'> {
        async findById(_id: string): Promise<Event | null> {
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

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const shopRepository = new ShopRepositoryStub();
        const shopMemberRepository = new ShopMemberRepositoryStub();
        const sut = new GetEventByIdUseCase(
            eventRepository,
            shopRepository,
            shopMemberRepository,
        );

        return {
            sut,
            eventRepository,
            shopRepository,
            shopMemberRepository,
        };
    };

    it('should get event by id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(shop.id, event.id, user.id);

        expect(result).toEqual({
            ...event,
            shop_id: shop.id,
            created_by_user_id: user.id,
        });
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
});

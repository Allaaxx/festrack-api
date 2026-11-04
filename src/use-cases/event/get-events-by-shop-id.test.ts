import { describe, it, expect, jest } from 'bun:test';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { event, user, shop } from '../../tests/index.js';
import { GetEventsByShopIdUseCase } from './get-events-by-shop-id.js';
import {
    Event,
    EventRepository,
    Shop,
    ShopRepository,
    ShopMember,
    ShopMemberRepository,
} from '../../domain/index.js';

describe('Get Events By Shop Id Use Case', () => {
    class EventRepositoryStub implements Pick<EventRepository, 'findByShopId'> {
        async findByShopId(_shopId: string): Promise<Event[]> {
            return [
                {
                    ...event,
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                },
            ];
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
        const sut = new GetEventsByShopIdUseCase(
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

    it('should get events by shop id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(shop.id, user.id);

        expect(result).toHaveLength(1);
        expect(result[0].shop_id).toBe(shop.id);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const { sut, shopRepository } = makeSut();
        jest.spyOn(shopRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, user.id);

        await expect(promise).rejects.toThrow(new ShopNotFoundError(shop.id));
    });

    it('should throw ForbiddenError if user is not a member of shop', async () => {
        const { sut, shopMemberRepository } = makeSut();
        jest.spyOn(
            shopMemberRepository,
            'findByShopAndUserId',
        ).mockResolvedValueOnce(null);

        const promise = sut.execute(shop.id, user.id);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });
});

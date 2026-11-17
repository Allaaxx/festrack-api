import { describe, it, expect, beforeEach } from 'bun:test';
import { GetEventTagsByShopIdUseCase } from './get-event-tags-by-shop-id.js';
import {
    EventTagRepository,
    ShopRepository,
    ShopMemberRepository,
    EventTag,
} from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('GetEventTagsByShopIdUseCase (Unit Tests)', () => {
    let sut: GetEventTagsByShopIdUseCase;
    let mockEventTagRepository: Pick<EventTagRepository, 'findByShopId'>;
    let mockShopRepository: Pick<ShopRepository, 'findById'>;
    let mockShopMemberRepository: Pick<
        ShopMemberRepository,
        'findByShopAndUserId'
    >;

    const shopId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        mockEventTagRepository = {
            findByShopId: async () => [],
        };

        mockShopRepository = {
            findById: async (id: string) => ({
                id,
                name: 'Test Shop',
                description: 'Test Description',
                created_at: new Date(),
                updated_at: new Date(),
            }),
        };

        mockShopMemberRepository = {
            findByShopAndUserId: async (sId: string, uId: string) => ({
                id: 'member-1',
                shop_id: sId,
                user_id: uId,
                role: 'OWNER',
                created_at: new Date(),
                updated_at: new Date(),
            }),
        };

        sut = new GetEventTagsByShopIdUseCase(
            mockEventTagRepository,
            mockShopRepository,
            mockShopMemberRepository,
        );
    });

    it('should return an empty array when the shop has no custom event tags', async () => {
        const result = await sut.execute(shopId, userId);

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
    });

    it('should return only shop custom tags without injecting system defaults', async () => {
        const customTag: EventTag = {
            id: 'custom-tag-1',
            shop_id: shopId,
            name: 'VIP Gala',
            slug: 'vip-gala',
            color: 'bg-pink-500',
            created_at: new Date('2026-01-01'),
        };

        mockEventTagRepository.findByShopId = async () => [customTag];

        const result = await sut.execute(shopId, userId);

        expect(result).toHaveLength(1);
        expect(result).toEqual([customTag]);
        expect('is_system' in result[0]!).toBe(false);
    });

    it('should throw ShopNotFoundError if the shop does not exist', async () => {
        mockShopRepository.findById = async () => null;

        await expect(sut.execute(shopId, userId)).rejects.toThrow(
            new ShopNotFoundError(shopId),
        );
    });

    it('should throw ForbiddenError if the user is not a member of the shop', async () => {
        mockShopMemberRepository.findByShopAndUserId = async () => null;

        await expect(sut.execute(shopId, userId)).rejects.toThrow(
            new ForbiddenError(),
        );
    });
});

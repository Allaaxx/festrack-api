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

    it('should return all 5 system default event tags when the shop has no custom tags', async () => {
        const result = await sut.execute(shopId, userId);

        expect(result).toHaveLength(5);
        expect(result.every((tag) => tag.is_system === true)).toBe(true);
        expect(result.every((tag) => tag.shop_id === shopId)).toBe(true);

        const slugs = result.map((t) => t.slug);
        expect(slugs).toContain('family');
        expect(slugs).toContain('business');
        expect(slugs).toContain('personal');
        expect(slugs).toContain('holiday');
        expect(slugs).toContain('etc');

        const familyTag = result.find((t) => t.slug === 'family');
        expect(familyTag).toMatchObject({
            name: 'Família',
            slug: 'family',
            color: 'bg-emerald-500',
            is_system: true,
            shop_id: shopId,
        });

        const businessTag = result.find((t) => t.slug === 'business');
        expect(businessTag).toMatchObject({
            name: 'Negócios',
            slug: 'business',
            color: 'bg-blue-500',
            is_system: true,
            shop_id: shopId,
        });

        const personalTag = result.find((t) => t.slug === 'personal');
        expect(personalTag).toMatchObject({
            name: 'Pessoal',
            slug: 'personal',
            color: 'bg-purple-500',
            is_system: true,
            shop_id: shopId,
        });

        const holidayTag = result.find((t) => t.slug === 'holiday');
        expect(holidayTag).toMatchObject({
            name: 'Feriado',
            slug: 'holiday',
            color: 'bg-amber-500',
            is_system: true,
            shop_id: shopId,
        });

        const etcTag = result.find((t) => t.slug === 'etc');
        expect(etcTag).toMatchObject({
            name: 'Outros',
            slug: 'etc',
            color: 'bg-slate-500',
            is_system: true,
            shop_id: shopId,
        });
    });

    it('should merge system default tags with shop custom tags', async () => {
        const customTag: EventTag = {
            id: 'custom-tag-1',
            shop_id: shopId,
            name: 'VIP Gala',
            slug: 'vip-gala',
            color: 'bg-pink-500',
            is_system: false,
            created_at: new Date('2026-01-01'),
        };

        mockEventTagRepository.findByShopId = async () => [customTag];

        const result = await sut.execute(shopId, userId);

        expect(result).toHaveLength(6);
        expect(result.map((t) => t.slug)).toContain('vip-gala');
        const foundCustom = result.find((t) => t.slug === 'vip-gala');
        expect(foundCustom).toEqual(customTag);
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

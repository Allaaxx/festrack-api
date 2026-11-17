import { describe, it, expect, beforeEach } from 'bun:test';
import { CreateEventTagUseCase } from './create-event-tag.js';
import {
    EventTagRepository,
    ShopRepository,
    ShopMemberRepository,
    EventTag,
    CreateEventTagParams,
} from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    EventTagConflictError,
    InvalidEventTagSlugError,
} from '../../errors/event-tag.js';

describe('CreateEventTagUseCase (Unit Tests)', () => {
    let sut: CreateEventTagUseCase;
    let mockEventTagRepository: Pick<
        EventTagRepository,
        'create' | 'findBySlug'
    >;
    let mockShopRepository: Pick<ShopRepository, 'findById'>;
    let mockShopMemberRepository: Pick<
        ShopMemberRepository,
        'findByShopAndUserId'
    >;
    let createdTags: EventTag[];

    const shopId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        createdTags = [];

        mockEventTagRepository = {
            create: async (params: CreateEventTagParams): Promise<EventTag> => {
                const tag: EventTag = {
                    id: 'tag-1',
                    shop_id: params.shop_id,
                    name: params.name,
                    slug: params.slug,
                    color: params.color,
                    created_at: new Date(),
                };
                createdTags.push(tag);
                return tag;
            },
            findBySlug: async (
                sId: string,
                slug: string,
            ): Promise<EventTag | null> => {
                const found = createdTags.find(
                    (t) => t.shop_id === sId && t.slug === slug,
                );
                return found ?? null;
            },
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

        sut = new CreateEventTagUseCase(
            mockEventTagRepository,
            mockShopRepository,
            mockShopMemberRepository,
        );
    });

    it('should create an event tag and generate kebab-case slug when slug is not provided', async () => {
        const result = await sut.execute({
            shopId,
            userId,
            name: 'Aniversário de Casamento',
            color: 'bg-emerald-500',
        });

        expect(result.id).toBe('tag-1');
        expect(result.shop_id).toBe(shopId);
        expect(result.name).toBe('Aniversário de Casamento');
        expect(result.slug).toBe('aniversario-de-casamento');
        expect(result.color).toBe('bg-emerald-500');
        expect((result as any).is_system).toBeUndefined();
    });

    it('should normalize explicit slug to lowercase kebab-case', async () => {
        const result = await sut.execute({
            shopId,
            userId,
            name: 'Special Event',
            color: 'bg-blue-500',
            slug: '  My Custom--Event!!  ',
        });

        expect(result.slug).toBe('my-custom-event');
    });

    it('should strip accents, diacritics and special characters from derived slug', async () => {
        const result = await sut.execute({
            shopId,
            userId,
            name: '  ---Chá de Bebê & Revelação 2026---  ',
            color: 'bg-purple-500',
        });

        expect(result.slug).toBe('cha-de-bebe-revelacao-2026');
    });

    it('should allow shop MEMBER role to create an event tag', async () => {
        mockShopMemberRepository.findByShopAndUserId = async (
            sId: string,
            uId: string,
        ) => ({
            id: 'member-2',
            shop_id: sId,
            user_id: uId,
            role: 'MEMBER',
            created_at: new Date(),
            updated_at: new Date(),
        });

        const result = await sut.execute({
            shopId,
            userId,
            name: 'Member Tag',
            color: 'bg-yellow-500',
        });

        expect(result.name).toBe('Member Tag');
        expect(result.slug).toBe('member-tag');
    });

    it('should throw ShopNotFoundError if the shop does not exist', async () => {
        mockShopRepository.findById = async () => null;

        await expect(
            sut.execute({
                shopId,
                userId,
                name: 'Tag',
                color: 'bg-red-500',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError if the user is not a shop member', async () => {
        mockShopMemberRepository.findByShopAndUserId = async () => null;

        await expect(
            sut.execute({
                shopId,
                userId,
                name: 'Tag',
                color: 'bg-red-500',
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should allow creating custom tags with slugs that were previously system defaults', async () => {
        // Slugs previously reserved: family, holiday, business, personal, etc
        const familyTag = await sut.execute({
            shopId,
            userId,
            name: 'Family',
            color: 'bg-emerald-500',
        });
        expect(familyTag.slug).toBe('family');
        expect(familyTag.name).toBe('Family');
        expect(familyTag.shop_id).toBe(shopId);
        expect((familyTag as any).is_system).toBeUndefined();

        const holidayTag = await sut.execute({
            shopId,
            userId,
            name: 'Custom Holiday',
            color: 'bg-amber-500',
            slug: 'holiday',
        });
        expect(holidayTag.slug).toBe('holiday');
        expect((holidayTag as any).is_system).toBeUndefined();

        const businessTag = await sut.execute({
            shopId,
            userId,
            name: 'Outros Negócios',
            color: 'bg-blue-500',
            slug: 'business',
        });
        expect(businessTag.slug).toBe('business');
        expect((businessTag as any).is_system).toBeUndefined();

        const personalTag = await sut.execute({
            shopId,
            userId,
            name: 'Personal Tag',
            color: 'bg-purple-500',
            slug: 'PERSONAL',
        });
        expect(personalTag.slug).toBe('personal');
        expect((personalTag as any).is_system).toBeUndefined();

        const etcTag = await sut.execute({
            shopId,
            userId,
            name: 'Etc',
            color: 'bg-slate-500',
        });
        expect(etcTag.slug).toBe('etc');
        expect((etcTag as any).is_system).toBeUndefined();
    });

    it('should throw EventTagConflictError when slug already exists in the same shop', async () => {
        await sut.execute({
            shopId,
            userId,
            name: 'Workshop Fest',
            color: 'bg-teal-500',
        });

        // Attempt duplicate by derived slug
        await expect(
            sut.execute({
                shopId,
                userId,
                name: 'Workshop Fest',
                color: 'bg-teal-500',
            }),
        ).rejects.toThrow(EventTagConflictError);

        // Attempt duplicate by explicit slug
        await expect(
            sut.execute({
                shopId,
                userId,
                name: 'Another Workshop',
                color: 'bg-indigo-500',
                slug: 'workshop-fest',
            }),
        ).rejects.toThrow(EventTagConflictError);
    });

    it('should allow same slug in a different shop (tenant isolation)', async () => {
        const otherShopId = '33333333-3333-4333-8333-333333333333';

        await sut.execute({
            shopId,
            userId,
            name: 'Fest Tag',
            color: 'bg-blue-500',
        });

        // Creating same slug in other shop should succeed
        const result = await sut.execute({
            shopId: otherShopId,
            userId,
            name: 'Fest Tag',
            color: 'bg-blue-500',
        });

        expect(result.shop_id).toBe(otherShopId);
        expect(result.slug).toBe('fest-tag');
    });

    it('should throw InvalidEventTagSlugError when name normalizes to empty string', async () => {
        await expect(
            sut.execute({
                shopId,
                userId,
                name: '???',
                color: 'bg-blue-500',
            }),
        ).rejects.toThrow(InvalidEventTagSlugError);

        await expect(
            sut.execute({
                shopId,
                userId,
                name: '🎉🎉',
                color: 'bg-blue-500',
            }),
        ).rejects.toThrow(InvalidEventTagSlugError);
    });

    it('should throw InvalidEventTagSlugError when provided slug normalizes to empty string', async () => {
        await expect(
            sut.execute({
                shopId,
                userId,
                name: 'Valid Name',
                color: 'bg-blue-500',
                slug: '---',
            }),
        ).rejects.toThrow(InvalidEventTagSlugError);

        await expect(
            sut.execute({
                shopId,
                userId,
                name: 'Valid Name',
                color: 'bg-blue-500',
                slug: '!@#$%',
            }),
        ).rejects.toThrow(InvalidEventTagSlugError);
    });
});

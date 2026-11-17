import { describe, it, expect, beforeEach } from 'bun:test';
import { DeleteEventTagUseCase } from './delete-event-tag.js';
import {
    EventTagRepository,
    EventRepository,
    ShopRepository,
    ShopMemberRepository,
    EventTag,
} from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    EventTagNotFoundError,
    CannotDeleteSystemTagError,
} from '../../errors/event-tag.js';

describe('DeleteEventTagUseCase (Unit Tests)', () => {
    let sut: DeleteEventTagUseCase;
    let mockEventTagRepository: Pick<EventTagRepository, 'findById' | 'delete'>;
    let mockEventRepository: Pick<EventRepository, 'reassignTag'>;
    let mockShopRepository: Pick<ShopRepository, 'findById'>;
    let mockShopMemberRepository: Pick<
        ShopMemberRepository,
        'findByShopAndUserId'
    >;

    let tags: (EventTag & { is_system?: boolean })[];
    let reassignCalls: Array<{
        shopId: string;
        fromSlug: string;
        toSlug: string;
    }>;

    const shopId = '11111111-1111-4111-8111-111111111111';
    const otherShopId = '99999999-9999-4999-8999-999999999999';
    const userId = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        tags = [
            {
                id: 'custom-tag-1',
                shop_id: shopId,
                name: 'Aniversário',
                slug: 'aniversario',
                color: 'bg-emerald-500',
                is_system: false,
                created_at: new Date(),
            },
            {
                id: 'custom-tag-other-shop',
                shop_id: otherShopId,
                name: 'Outra Loja',
                slug: 'outra-loja',
                color: 'bg-red-500',
                is_system: false,
                created_at: new Date(),
            },
            {
                id: 'system-persisted-tag',
                shop_id: shopId,
                name: 'Builtin',
                slug: 'builtin',
                color: 'bg-blue-500',
                is_system: true,
                created_at: new Date(),
            },
        ];

        reassignCalls = [];

        mockEventTagRepository = {
            findById: async (
                id: string,
                sId: string,
            ): Promise<EventTag | null> => {
                const found = tags.find(
                    (t) => t.id === id && t.shop_id === sId,
                );
                return found ?? null;
            },
            delete: async (id: string, sId: string): Promise<EventTag> => {
                const index = tags.findIndex(
                    (t) => t.id === id && t.shop_id === sId,
                );
                if (index === -1) {
                    throw new EventTagNotFoundError(id);
                }
                const [deleted] = tags.splice(index, 1);
                return deleted;
            },
        };

        mockEventRepository = {
            reassignTag: async (
                sId: string,
                fromSlug: string,
                toSlug: string,
            ): Promise<number> => {
                reassignCalls.push({ shopId: sId, fromSlug, toSlug });
                return 3;
            },
        };

        mockShopRepository = {
            findById: async (id: string) => {
                if (id === shopId || id === otherShopId) {
                    return {
                        id,
                        name: 'Test Shop',
                        description: 'Test Description',
                        created_at: new Date(),
                        updated_at: new Date(),
                    };
                }
                return null;
            },
        };

        mockShopMemberRepository = {
            findByShopAndUserId: async (sId: string, uId: string) => {
                if (uId === userId && (sId === shopId || sId === otherShopId)) {
                    return {
                        id: 'member-1',
                        shop_id: sId,
                        user_id: uId,
                        role: 'OWNER' as const,
                        created_at: new Date(),
                        updated_at: new Date(),
                    };
                }
                return null;
            },
        };

        sut = new DeleteEventTagUseCase(
            mockEventTagRepository,
            mockEventRepository,
            mockShopRepository,
            mockShopMemberRepository,
        );
    });

    it('should delete custom event tag and reassign referencing events to etc', async () => {
        const result = await sut.execute({
            shopId,
            tagId: 'custom-tag-1',
            userId,
        });

        expect(result.id).toBe('custom-tag-1');
        expect(result.slug).toBe('aniversario');
        expect(tags.find((t) => t.id === 'custom-tag-1')).toBeUndefined();

        expect(reassignCalls).toHaveLength(1);
        expect(reassignCalls[0]).toEqual({
            shopId,
            fromSlug: 'aniversario',
            toSlug: 'etc',
        });
    });

    it('should throw EventTagNotFoundError when tagId starts with system- but is not a recognized system tag', async () => {
        await expect(
            sut.execute({
                shopId,
                tagId: 'system-unknown',
                userId,
            }),
        ).rejects.toThrow(EventTagNotFoundError);
    });

    it('should throw ShopNotFoundError when shop does not exist', async () => {
        await expect(
            sut.execute({
                shopId: '00000000-0000-4000-8000-000000000000',
                tagId: 'custom-tag-1',
                userId,
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError when user is not a member of shop', async () => {
        await expect(
            sut.execute({
                shopId,
                tagId: 'custom-tag-1',
                userId: 'non-member-id',
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw CannotDeleteSystemTagError when tagId is a system default tag ID', async () => {
        const systemIds = [
            'system-family',
            'system-business',
            'system-personal',
            'system-holiday',
            'system-etc',
        ];

        for (const sysId of systemIds) {
            await expect(
                sut.execute({
                    shopId,
                    tagId: sysId,
                    userId,
                }),
            ).rejects.toThrow(CannotDeleteSystemTagError);
        }
    });

    it('should throw CannotDeleteSystemTagError when tagId is a system tag slug', async () => {
        const systemSlugs = [
            'family',
            'business',
            'personal',
            'holiday',
            'etc',
        ];

        for (const slug of systemSlugs) {
            await expect(
                sut.execute({
                    shopId,
                    tagId: slug,
                    userId,
                }),
            ).rejects.toThrow(CannotDeleteSystemTagError);
        }
    });

    it('should throw EventTagNotFoundError when tag is not found by id in the shop', async () => {
        await expect(
            sut.execute({
                shopId,
                tagId: 'non-existent-tag-id',
                userId,
            }),
        ).rejects.toThrow(EventTagNotFoundError);
    });

    it('should throw EventTagNotFoundError when tag belongs to another shop', async () => {
        await expect(
            sut.execute({
                shopId,
                tagId: 'custom-tag-other-shop',
                userId,
            }),
        ).rejects.toThrow(EventTagNotFoundError);
    });

    it('should throw CannotDeleteSystemTagError when persisted tag has is_system === true', async () => {
        await expect(
            sut.execute({
                shopId,
                tagId: 'system-persisted-tag',
                userId,
            }),
        ).rejects.toThrow(CannotDeleteSystemTagError);
    });
});

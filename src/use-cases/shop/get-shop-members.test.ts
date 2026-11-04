import { describe, it, expect, mock } from 'bun:test';
import { GetShopMembersUseCase } from './get-shop-members.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Shop, ShopMember, ShopMemberWithUser } from '../../domain/index.js';

describe('Get Shop Members Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'Shop',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const activeMember: ShopMember = {
        id: 'm-1',
        shop_id: 'shop-1',
        user_id: 'u-1',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const fakeMembersWithUsers: ShopMemberWithUser[] = [
        {
            ...activeMember,
            user: {
                id: 'u-1',
                email: 'u1@example.com',
                name: 'User One',
                first_name: 'User',
                last_name: 'One',
                image: null,
            },
        },
    ];

    it('should return shop members for an active member', async () => {
        const sut = new GetShopMembersUseCase(
            { findById: mock(async () => fakeShop) } as any,
            {
                findByShopAndUserId: mock(async () => activeMember),
                findByShopIdWithUsers: mock(async () => fakeMembersWithUsers),
            } as any,
        );

        const result = await sut.execute({ shopId: 'shop-1', userId: 'u-1' });
        expect(result).toEqual(fakeMembersWithUsers);
    });

    it('should throw ShopNotFoundError if shop not found', async () => {
        const sut = new GetShopMembersUseCase(
            { findById: mock(async () => null) } as any,
            {} as any,
        );

        await expect(
            sut.execute({ shopId: 'shop-1', userId: 'u-1' }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError if user is not a member of the shop', async () => {
        const sut = new GetShopMembersUseCase(
            { findById: mock(async () => fakeShop) } as any,
            { findByShopAndUserId: mock(async () => null) } as any,
        );

        await expect(
            sut.execute({ shopId: 'shop-1', userId: 'outsider' }),
        ).rejects.toThrow(ForbiddenError);
    });
});

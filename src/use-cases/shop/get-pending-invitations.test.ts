import { describe, it, expect, mock } from 'bun:test';
import { GetPendingInvitationsUseCase } from './get-pending-invitations.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Shop, ShopMember, ShopInvitation } from '../../domain/index.js';

describe('Get Pending Invitations Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'Shop',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const ownerMember: ShopMember = {
        id: 'm-1',
        shop_id: 'shop-1',
        user_id: 'u-1',
        role: 'OWNER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should list pending invitations for owner', async () => {
        const fakeInvites: ShopInvitation[] = [
            {
                id: 'inv-1',
                shop_id: 'shop-1',
                email: 'test@example.com',
                role: 'MEMBER',
                token: 'tok-1',
                status: 'PENDING',
                expires_at: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
            },
        ];

        const sut = new GetPendingInvitationsUseCase(
            { findById: mock(async () => fakeShop) } as any,
            { findByShopAndUserId: mock(async () => ownerMember) } as any,
            { findPendingByShopId: mock(async () => fakeInvites) } as any,
        );

        const result = await sut.execute({ shopId: 'shop-1', userId: 'u-1' });
        expect(result).toEqual(fakeInvites);
    });

    it('should throw ShopNotFoundError if shop not found', async () => {
        const sut = new GetPendingInvitationsUseCase(
            { findById: mock(async () => null) } as any,
            {} as any,
            {} as any,
        );

        await expect(
            sut.execute({ shopId: 'shop-1', userId: 'u-1' }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError if user is not OWNER', async () => {
        const sut = new GetPendingInvitationsUseCase(
            { findById: mock(async () => fakeShop) } as any,
            {
                findByShopAndUserId: mock(async () => ({
                    ...ownerMember,
                    role: 'MEMBER',
                })),
            } as any,
            {} as any,
        );

        await expect(
            sut.execute({ shopId: 'shop-1', userId: 'u-1' }),
        ).rejects.toThrow(ForbiddenError);
    });
});

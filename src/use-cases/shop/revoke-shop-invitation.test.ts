import { describe, it, expect, mock } from 'bun:test';
import { RevokeShopInvitationUseCase } from './revoke-shop-invitation.js';
import {
    ShopNotFoundError,
    ShopInvitationNotFoundError,
} from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Shop, ShopMember, ShopInvitation } from '../../domain/index.js';

describe('Revoke Shop Invitation Use Case', () => {
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

    const fakeInvite: ShopInvitation = {
        id: 'inv-1',
        shop_id: 'shop-1',
        email: 'test@example.com',
        role: 'MEMBER',
        token: 'tok-1',
        status: 'PENDING',
        expires_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should revoke invitation when caller is OWNER', async () => {
        const sut = new RevokeShopInvitationUseCase(
            { findById: mock(async () => fakeShop) } as any,
            { findByShopAndUserId: mock(async () => ownerMember) } as any,
            {
                findById: mock(async () => fakeInvite),
                update: mock(async () => ({
                    ...fakeInvite,
                    status: 'REVOKED',
                })),
            } as any,
        );

        const result = await sut.execute({
            shopId: 'shop-1',
            invitationId: 'inv-1',
            userId: 'u-1',
        });

        expect(result.status).toBe('REVOKED');
    });

    it('should throw ShopInvitationNotFoundError if invitation does not exist or wrong shop', async () => {
        const sut = new RevokeShopInvitationUseCase(
            { findById: mock(async () => fakeShop) } as any,
            { findByShopAndUserId: mock(async () => ownerMember) } as any,
            { findById: mock(async () => null) } as any,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                invitationId: 'wrong-id',
                userId: 'u-1',
            }),
        ).rejects.toThrow(ShopInvitationNotFoundError);
    });

    it('should throw ForbiddenError if not OWNER', async () => {
        const sut = new RevokeShopInvitationUseCase(
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
            sut.execute({
                shopId: 'shop-1',
                invitationId: 'inv-1',
                userId: 'u-1',
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const sut = new RevokeShopInvitationUseCase(
            { findById: mock(async () => null) } as any,
            {} as any,
            {} as any,
        );

        await expect(
            sut.execute({
                shopId: 'missing-shop',
                invitationId: 'inv-1',
                userId: 'u-1',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });
});

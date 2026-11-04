import { describe, it, expect, mock } from 'bun:test';
import { TransferShopOwnershipUseCase } from './transfer-shop-ownership.js';
import {
    ShopNotFoundError,
    TargetUserNotMemberError,
} from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Shop, ShopMember } from '../../domain/index.js';

describe('Transfer Shop Ownership Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'Shop',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const currentOwner: ShopMember = {
        id: 'm-1',
        shop_id: 'shop-1',
        user_id: 'owner-id',
        role: 'OWNER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const targetMember: ShopMember = {
        id: 'm-2',
        shop_id: 'shop-1',
        user_id: 'successor-id',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should transfer ownership to another member', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async (shopId, userId) => {
                if (userId === 'owner-id') return currentOwner;
                if (userId === 'successor-id') return targetMember;
                return null;
            }),
            updateRole: mock(async (shopId, userId, role) => ({
                id: 'm-x',
                shop_id: shopId,
                user_id: userId,
                role,
                created_at: new Date(),
                updated_at: new Date(),
            })),
        } as any;

        const sut = new TransferShopOwnershipUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        const result = await sut.execute({
            shopId: 'shop-1',
            currentOwnerUserId: 'owner-id',
            newOwnerUserId: 'successor-id',
        });

        expect(result.role).toBe('OWNER');
        expect(memberRepo.updateRole).toHaveBeenCalledWith(
            'shop-1',
            'owner-id',
            'MEMBER',
        );
        expect(memberRepo.updateRole).toHaveBeenCalledWith(
            'shop-1',
            'successor-id',
            'OWNER',
        );
    });

    it('should throw TargetUserNotMemberError if target user is not in shop', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async (shopId, userId) => {
                if (userId === 'owner-id') return currentOwner;
                return null;
            }),
        } as any;

        const sut = new TransferShopOwnershipUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                currentOwnerUserId: 'owner-id',
                newOwnerUserId: 'unknown-id',
            }),
        ).rejects.toThrow(TargetUserNotMemberError);
    });

    it('should throw ForbiddenError if caller is not OWNER', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async () => ({
                ...currentOwner,
                role: 'MEMBER',
            })),
        } as any;

        const sut = new TransferShopOwnershipUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                currentOwnerUserId: 'caller-id',
                newOwnerUserId: 'successor-id',
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const sut = new TransferShopOwnershipUseCase(
            { findById: mock(async () => null) } as any,
            {} as any,
        );

        await expect(
            sut.execute({
                shopId: 'missing-shop',
                currentOwnerUserId: 'owner-id',
                newOwnerUserId: 'successor-id',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });
});

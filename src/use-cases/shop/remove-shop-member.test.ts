import { describe, it, expect, mock } from 'bun:test';
import { RemoveShopMemberUseCase } from './remove-shop-member.js';
import {
    ShopNotFoundError,
    ShopMemberNotFoundError,
    ShopSoleOwnerCannotLeaveError,
} from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Shop, ShopMember } from '../../domain/index.js';

describe('Remove Shop Member Use Case', () => {
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
        user_id: 'owner-id',
        role: 'OWNER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const regularMember: ShopMember = {
        id: 'm-2',
        shop_id: 'shop-1',
        user_id: 'member-id',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should allow owner to remove another member', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async (shopId, userId) => {
                if (userId === 'member-id') return regularMember;
                if (userId === 'owner-id') return ownerMember;
                return null;
            }),
            delete: mock(async () => regularMember),
        } as any;

        const sut = new RemoveShopMemberUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        const result = await sut.execute({
            shopId: 'shop-1',
            callerUserId: 'owner-id',
            targetUserId: 'member-id',
        });

        expect(result).toEqual(regularMember);
        expect(memberRepo.delete).toHaveBeenCalledWith('shop-1', 'member-id');
    });

    it('should allow regular member to leave voluntarily', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async () => regularMember),
            delete: mock(async () => regularMember),
        } as any;

        const sut = new RemoveShopMemberUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        const result = await sut.execute({
            shopId: 'shop-1',
            callerUserId: 'member-id',
            targetUserId: 'member-id',
        });

        expect(result).toEqual(regularMember);
    });

    it('should prevent sole owner from leaving', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async () => ownerMember),
            countOwners: mock(async () => 1),
        } as any;

        const sut = new RemoveShopMemberUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                callerUserId: 'owner-id',
                targetUserId: 'owner-id',
            }),
        ).rejects.toThrow(ShopSoleOwnerCannotLeaveError);
    });

    it('should throw ForbiddenError if non-owner tries to remove another member', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async (shopId, userId) => {
                if (userId === 'target-id') return regularMember;
                return { ...regularMember, user_id: 'caller-id' };
            }),
        } as any;

        const sut = new RemoveShopMemberUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                callerUserId: 'caller-id',
                targetUserId: 'target-id',
            }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ShopMemberNotFoundError if target is not in shop', async () => {
        const memberRepo = {
            findByShopAndUserId: mock(async () => null),
        } as any;

        const sut = new RemoveShopMemberUseCase(
            { findById: mock(async () => fakeShop) } as any,
            memberRepo,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                callerUserId: 'owner-id',
                targetUserId: 'unknown-id',
            }),
        ).rejects.toThrow(ShopMemberNotFoundError);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const sut = new RemoveShopMemberUseCase(
            { findById: mock(async () => null) } as any,
            {} as any,
        );

        await expect(
            sut.execute({
                shopId: 'missing-shop',
                callerUserId: 'owner-id',
                targetUserId: 'target-id',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });
});

import { describe, it, expect, mock } from 'bun:test';
import { DeleteShopUseCase } from './delete-shop.js';
import { Shop, ShopMember } from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('Delete Shop Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'Coffee Lab',
        description: 'Roastery',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const ownerMember: ShopMember = {
        id: 'member-1',
        shop_id: 'shop-1',
        user_id: 'owner-id',
        role: 'OWNER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const regularMember: ShopMember = {
        id: 'member-2',
        shop_id: 'shop-1',
        user_id: 'member-id',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should allow OWNER to delete the shop', async () => {
        const shopRepository = {
            findById: mock(async () => fakeShop),
            delete: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => ownerMember),
        };

        const useCase = new DeleteShopUseCase(
            shopRepository,
            shopMemberRepository,
        );

        const result = await useCase.execute('shop-1', 'owner-id');

        expect(shopRepository.findById).toHaveBeenCalledWith('shop-1');
        expect(shopMemberRepository.findByShopAndUserId).toHaveBeenCalledWith(
            'shop-1',
            'owner-id',
        );
        expect(shopRepository.delete).toHaveBeenCalledWith('shop-1');
        expect(result).toEqual(fakeShop);
    });

    it('should throw ForbiddenError if user is a MEMBER (not OWNER)', async () => {
        const shopRepository = {
            findById: mock(async () => fakeShop),
            delete: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => regularMember),
        };

        const useCase = new DeleteShopUseCase(
            shopRepository,
            shopMemberRepository,
        );

        expect(useCase.execute('shop-1', 'member-id')).rejects.toThrow(
            ForbiddenError,
        );
        expect(shopRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError if user is not a member', async () => {
        const shopRepository = {
            findById: mock(async () => fakeShop),
            delete: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => null),
        };

        const useCase = new DeleteShopUseCase(
            shopRepository,
            shopMemberRepository,
        );

        expect(useCase.execute('shop-1', 'stranger-id')).rejects.toThrow(
            ForbiddenError,
        );
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const shopRepository = {
            findById: mock(async () => null),
            delete: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => null),
        };

        const useCase = new DeleteShopUseCase(
            shopRepository,
            shopMemberRepository,
        );

        expect(useCase.execute('shop-1', 'owner-id')).rejects.toThrow(
            ShopNotFoundError,
        );
    });
});

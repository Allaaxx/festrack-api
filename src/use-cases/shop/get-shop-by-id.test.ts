import { describe, it, expect, mock } from 'bun:test';
import { GetShopByIdUseCase } from './get-shop-by-id.js';
import { Shop, ShopMember } from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

describe('Get Shop By Id Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'Coffee Lab',
        description: 'Roastery',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const fakeMember: ShopMember = {
        id: 'member-1',
        shop_id: 'shop-1',
        user_id: 'user-1',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should return shop if user is a member', async () => {
        const shopRepository = {
            findById: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => fakeMember),
        };

        const useCase = new GetShopByIdUseCase(
            shopRepository,
            shopMemberRepository,
        );
        const result = await useCase.execute('shop-1', 'user-1');

        expect(shopRepository.findById).toHaveBeenCalledWith('shop-1');
        expect(shopMemberRepository.findByShopAndUserId).toHaveBeenCalledWith(
            'shop-1',
            'user-1',
        );
        expect(result).toEqual(fakeShop);
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const shopRepository = {
            findById: mock(async () => null),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => null),
        };

        const useCase = new GetShopByIdUseCase(
            shopRepository,
            shopMemberRepository,
        );

        expect(useCase.execute('shop-1', 'user-1')).rejects.toThrow(
            ShopNotFoundError,
        );
    });

    it('should throw ForbiddenError if user is not a member of the shop', async () => {
        const shopRepository = {
            findById: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => null),
        };

        const useCase = new GetShopByIdUseCase(
            shopRepository,
            shopMemberRepository,
        );

        expect(useCase.execute('shop-1', 'other-user')).rejects.toThrow(
            ForbiddenError,
        );
    });
});

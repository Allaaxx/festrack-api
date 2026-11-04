import { describe, it, expect, mock } from 'bun:test';
import { CreateShopUseCase } from './create-shop.js';
import { Shop, ShopMember } from '../../domain/index.js';

describe('Create Shop Use Case', () => {
    it('should create a shop and add the creator as OWNER', async () => {
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
            role: 'OWNER',
            created_at: new Date(),
            updated_at: new Date(),
        };

        const shopRepository = {
            create: mock(async () => fakeShop),
        };
        const shopMemberRepository = {
            create: mock(async () => fakeMember),
        };

        const useCase = new CreateShopUseCase(
            shopRepository,
            shopMemberRepository,
        );

        const result = await useCase.execute({
            userId: 'user-1',
            name: 'Coffee Lab',
            description: 'Roastery',
        });

        expect(shopRepository.create).toHaveBeenCalledWith({
            name: 'Coffee Lab',
            description: 'Roastery',
        });
        expect(shopMemberRepository.create).toHaveBeenCalledWith({
            shop_id: 'shop-1',
            user_id: 'user-1',
            role: 'OWNER',
        });
        expect(result).toEqual({
            ...fakeShop,
            role: 'OWNER',
        });
    });

    it('should throw if shopRepository.create throws', async () => {
        const shopRepository = {
            create: mock(async () => {
                throw new Error('DB Error');
            }),
        };
        const shopMemberRepository = {
            create: mock(async () => ({}) as ShopMember),
        };

        const useCase = new CreateShopUseCase(
            shopRepository,
            shopMemberRepository,
        );

        expect(
            useCase.execute({
                userId: 'user-1',
                name: 'Coffee Lab',
            }),
        ).rejects.toThrow('DB Error');
    });
});

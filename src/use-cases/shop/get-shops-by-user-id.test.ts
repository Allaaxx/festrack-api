import { describe, it, expect, mock } from 'bun:test';
import { GetShopsByUserIdUseCase } from './get-shops-by-user-id.js';
import { UserShop } from '../../domain/index.js';

describe('Get Shops By User Id Use Case', () => {
    it('should return list of shops for user', async () => {
        const fakeShops: UserShop[] = [
            {
                id: 'shop-1',
                name: 'Coffee Lab',
                description: 'Roastery',
                role: 'OWNER',
                created_at: new Date(),
                updated_at: new Date(),
            },
        ];

        const shopRepository = {
            findByUserId: mock(async () => fakeShops),
        };

        const useCase = new GetShopsByUserIdUseCase(shopRepository);
        const result = await useCase.execute('user-1');

        expect(shopRepository.findByUserId).toHaveBeenCalledWith('user-1');
        expect(result).toEqual(fakeShops);
    });
});

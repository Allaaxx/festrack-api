import { ShopRepository, UserShop } from '../../domain/index.js';

export class GetShopsByUserIdUseCase {
    constructor(
        private readonly shopRepository: Pick<ShopRepository, 'findByUserId'>,
    ) {}

    async execute(userId: string): Promise<UserShop[]> {
        return await this.shopRepository.findByUserId(userId);
    }
}

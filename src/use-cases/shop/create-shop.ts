import {
    ShopRepository,
    ShopMemberRepository,
    UserShop,
} from '../../domain/index.js';

export interface CreateShopInput {
    userId: string;
    name: string;
    description?: string | null;
}

export class CreateShopUseCase {
    constructor(
        private readonly shopRepository: Pick<ShopRepository, 'create'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'create'
        >,
    ) {}

    async execute(input: CreateShopInput): Promise<UserShop> {
        const shop = await this.shopRepository.create({
            name: input.name,
            description: input.description ?? null,
        });

        const member = await this.shopMemberRepository.create({
            shop_id: shop.id,
            user_id: input.userId,
            role: 'OWNER',
        });

        return {
            ...shop,
            role: member.role,
        };
    }
}

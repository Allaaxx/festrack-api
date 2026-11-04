import {
    ShopMemberWithUser,
    ShopRepository,
    ShopMemberRepository,
} from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

export interface GetShopMembersInput {
    shopId: string;
    userId: string;
}

export class GetShopMembersUseCase {
    constructor(
        private readonly shopRepository: ShopRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
    ) {}

    async execute(input: GetShopMembersInput): Promise<ShopMemberWithUser[]> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const callerMember =
            await this.shopMemberRepository.findByShopAndUserId(
                input.shopId,
                input.userId,
            );

        if (!callerMember) {
            throw new ForbiddenError(
                'Only members of this shop can view its member list.',
            );
        }

        return await this.shopMemberRepository.findByShopIdWithUsers(
            input.shopId,
        );
    }
}

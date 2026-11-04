import {
    ShopInvitation,
    ShopRepository,
    ShopMemberRepository,
    ShopInvitationRepository,
} from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

export interface GetPendingInvitationsInput {
    shopId: string;
    userId: string;
}

export class GetPendingInvitationsUseCase {
    constructor(
        private readonly shopRepository: ShopRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
        private readonly shopInvitationRepository: ShopInvitationRepository,
    ) {}

    async execute(
        input: GetPendingInvitationsInput,
    ): Promise<ShopInvitation[]> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const callerMember =
            await this.shopMemberRepository.findByShopAndUserId(
                input.shopId,
                input.userId,
            );

        if (!callerMember || callerMember.role !== 'OWNER') {
            throw new ForbiddenError('Only shop owners can list invitations.');
        }

        return await this.shopInvitationRepository.findPendingByShopId(
            input.shopId,
        );
    }
}

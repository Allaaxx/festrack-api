import {
    ShopInvitation,
    ShopRepository,
    ShopMemberRepository,
    ShopInvitationRepository,
} from '../../domain/index.js';
import {
    ShopNotFoundError,
    ShopInvitationNotFoundError,
} from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

export interface RevokeShopInvitationInput {
    shopId: string;
    invitationId: string;
    userId: string;
}

export class RevokeShopInvitationUseCase {
    constructor(
        private readonly shopRepository: ShopRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
        private readonly shopInvitationRepository: ShopInvitationRepository,
    ) {}

    async execute(input: RevokeShopInvitationInput): Promise<ShopInvitation> {
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
            throw new ForbiddenError(
                'Only shop owners can revoke invitations.',
            );
        }

        const invitation = await this.shopInvitationRepository.findById(
            input.invitationId,
        );

        if (!invitation || invitation.shop_id !== input.shopId) {
            throw new ShopInvitationNotFoundError(
                `Invitation with id ${input.invitationId} not found.`,
            );
        }

        return await this.shopInvitationRepository.update(input.invitationId, {
            status: 'REVOKED',
        });
    }
}

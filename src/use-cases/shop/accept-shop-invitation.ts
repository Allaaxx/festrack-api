import {
    ShopMember,
    ShopInvitationRepository,
    ShopMemberRepository,
} from '../../domain/index.js';
import {
    ShopInvitationNotFoundError,
    ShopInvitationExpiredError,
    ShopInvitationEmailMismatchError,
    UserAlreadyShopMemberError,
} from '../../errors/shop.js';

export interface AcceptShopInvitationInput {
    token: string;
    user: {
        id: string;
        email: string;
    };
}

export class AcceptShopInvitationUseCase {
    constructor(
        private readonly shopInvitationRepository: ShopInvitationRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
    ) {}

    async execute(input: AcceptShopInvitationInput): Promise<ShopMember> {
        const invitation = await this.shopInvitationRepository.findByToken(
            input.token,
        );

        if (!invitation || invitation.status !== 'PENDING') {
            throw new ShopInvitationNotFoundError(
                'Invitation token is invalid, revoked, or already accepted.',
            );
        }

        if (new Date(invitation.expires_at).getTime() < Date.now()) {
            throw new ShopInvitationExpiredError('Invitation has expired.');
        }

        if (
            input.user.email.trim().toLowerCase() !==
            invitation.email.trim().toLowerCase()
        ) {
            throw new ShopInvitationEmailMismatchError(
                'Authenticated user email does not match invitation recipient email.',
            );
        }

        const existingMember =
            await this.shopMemberRepository.findByShopAndUserId(
                invitation.shop_id,
                input.user.id,
            );

        if (existingMember) {
            throw new UserAlreadyShopMemberError(
                input.user.email,
                invitation.shop_id,
            );
        }

        const member = await this.shopMemberRepository.create({
            shop_id: invitation.shop_id,
            user_id: input.user.id,
            role: invitation.role,
        });

        await this.shopInvitationRepository.update(invitation.id, {
            status: 'ACCEPTED',
        });

        return member;
    }
}

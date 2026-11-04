import {
    ShopInvitation,
    ShopRole,
    ShopRepository,
    ShopMemberRepository,
    ShopInvitationRepository,
    EmailService,
} from '../../domain/index.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

export interface CreateShopInvitationInput {
    shopId: string;
    userId: string;
    email: string;
    role?: ShopRole;
}

export class CreateShopInvitationUseCase {
    constructor(
        private readonly shopRepository: ShopRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
        private readonly shopInvitationRepository: ShopInvitationRepository,
        private readonly emailService: EmailService,
    ) {}

    async execute(input: CreateShopInvitationInput): Promise<ShopInvitation> {
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
                'Only shop owners can create invitations.',
            );
        }

        const normalizedEmail = input.email.trim().toLowerCase();
        const role = input.role ?? 'MEMBER';
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + sevenDaysMs);
        const token = crypto.randomUUID();

        const existingPending =
            await this.shopInvitationRepository.findPendingByShopIdAndEmail(
                input.shopId,
                normalizedEmail,
            );

        let invitation: ShopInvitation;

        if (existingPending) {
            invitation = await this.shopInvitationRepository.update(
                existingPending.id,
                {
                    token,
                    role,
                    expires_at: expiresAt,
                    status: 'PENDING',
                },
            );
        } else {
            invitation = await this.shopInvitationRepository.create({
                shop_id: input.shopId,
                email: normalizedEmail,
                role,
                token,
                expires_at: expiresAt,
            });
        }

        await this.emailService.sendInvitation({
            to: normalizedEmail,
            shopName: shop.name,
            token,
            role,
            expiresAt,
        });

        return invitation;
    }
}

import {
    ShopMember,
    ShopRepository,
    ShopMemberRepository,
} from '../../domain/index.js';
import {
    ShopNotFoundError,
    ShopMemberNotFoundError,
    ShopSoleOwnerCannotLeaveError,
} from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

export interface RemoveShopMemberInput {
    shopId: string;
    callerUserId: string;
    targetUserId: string;
}

export class RemoveShopMemberUseCase {
    constructor(
        private readonly shopRepository: ShopRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
    ) {}

    async execute(input: RemoveShopMemberInput): Promise<ShopMember> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const targetMember =
            await this.shopMemberRepository.findByShopAndUserId(
                input.shopId,
                input.targetUserId,
            );

        if (!targetMember) {
            throw new ShopMemberNotFoundError(input.shopId, input.targetUserId);
        }

        const isSelfLeaving = input.callerUserId === input.targetUserId;

        if (isSelfLeaving) {
            if (targetMember.role === 'OWNER') {
                const ownerCount = await this.shopMemberRepository.countOwners(
                    input.shopId,
                );
                if (ownerCount <= 1) {
                    throw new ShopSoleOwnerCannotLeaveError(
                        'Sole owner cannot leave without transferring ownership or deleting the shop.',
                    );
                }
            }
        } else {
            const callerMember =
                await this.shopMemberRepository.findByShopAndUserId(
                    input.shopId,
                    input.callerUserId,
                );

            if (!callerMember || callerMember.role !== 'OWNER') {
                throw new ForbiddenError(
                    'Only shop owners can remove members.',
                );
            }
        }

        return await this.shopMemberRepository.delete(
            input.shopId,
            input.targetUserId,
        );
    }
}

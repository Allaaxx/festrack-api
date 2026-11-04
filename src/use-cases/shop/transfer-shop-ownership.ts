import {
    ShopMember,
    ShopRepository,
    ShopMemberRepository,
} from '../../domain/index.js';
import {
    ShopNotFoundError,
    TargetUserNotMemberError,
} from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';

export interface TransferShopOwnershipInput {
    shopId: string;
    currentOwnerUserId: string;
    newOwnerUserId: string;
}

export class TransferShopOwnershipUseCase {
    constructor(
        private readonly shopRepository: ShopRepository,
        private readonly shopMemberRepository: ShopMemberRepository,
    ) {}

    async execute(input: TransferShopOwnershipInput): Promise<ShopMember> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const callerMember =
            await this.shopMemberRepository.findByShopAndUserId(
                input.shopId,
                input.currentOwnerUserId,
            );

        if (!callerMember || callerMember.role !== 'OWNER') {
            throw new ForbiddenError(
                'Only shop owners can transfer ownership.',
            );
        }

        const targetMember =
            await this.shopMemberRepository.findByShopAndUserId(
                input.shopId,
                input.newOwnerUserId,
            );

        if (!targetMember) {
            throw new TargetUserNotMemberError(
                input.newOwnerUserId,
                input.shopId,
            );
        }

        if (input.currentOwnerUserId === input.newOwnerUserId) {
            return targetMember;
        }

        await this.shopMemberRepository.updateRole(
            input.shopId,
            input.currentOwnerUserId,
            'MEMBER',
        );

        return await this.shopMemberRepository.updateRole(
            input.shopId,
            input.newOwnerUserId,
            'OWNER',
        );
    }
}

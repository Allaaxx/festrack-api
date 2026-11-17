import {
    ShopMember,
    ShopMemberRepository,
    User,
    UserRepository,
} from '../../domain/index.js';

export async function resolveShopOwner(
    shopId: string,
    member: Pick<ShopMember, 'role' | 'user_id'>,
    shopMemberRepository: Pick<ShopMemberRepository, 'findOwnerByShopId'>,
    userRepository: Pick<UserRepository, 'findById'>,
): Promise<User | null> {
    const ownerMember =
        member.role === 'OWNER'
            ? member
            : await shopMemberRepository.findOwnerByShopId(shopId);

    return ownerMember
        ? await userRepository.findById(ownerMember.user_id)
        : null;
}

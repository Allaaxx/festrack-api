import {
    ShopMember,
    ShopMemberWithUser,
    ShopRole,
    CreateShopMemberParams,
} from '../entities/shop-member.js';

export interface ShopMemberRepository {
    create(params: CreateShopMemberParams): Promise<ShopMember>;
    findByShopAndUserId(
        shopId: string,
        userId: string,
    ): Promise<ShopMember | null>;
    findByShopId(shopId: string): Promise<ShopMember[]>;
    findByShopIdWithUsers(shopId: string): Promise<ShopMemberWithUser[]>;
    findByUserId(userId: string): Promise<ShopMember[]>;
    updateRole(
        shopId: string,
        userId: string,
        role: ShopRole,
    ): Promise<ShopMember>;
    countOwners(shopId: string): Promise<number>;
    delete(shopId: string, userId: string): Promise<ShopMember>;
}

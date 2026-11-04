import { ShopMember, CreateShopMemberParams } from '../entities/shop-member.js';

export interface ShopMemberRepository {
    create(params: CreateShopMemberParams): Promise<ShopMember>;
    findByShopAndUserId(
        shopId: string,
        userId: string,
    ): Promise<ShopMember | null>;
    findByShopId(shopId: string): Promise<ShopMember[]>;
    findByUserId(userId: string): Promise<ShopMember[]>;
    delete(shopId: string, userId: string): Promise<ShopMember>;
}

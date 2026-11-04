export type ShopRole = 'OWNER' | 'MEMBER';

export interface ShopMember {
    id: string;
    shop_id: string;
    user_id: string;
    role: ShopRole;
    created_at: Date | string;
    updated_at: Date | string;
}

export interface CreateShopMemberParams {
    shop_id: string;
    user_id: string;
    role: ShopRole;
}

export interface UpdateShopMemberRoleParams {
    role: ShopRole;
}

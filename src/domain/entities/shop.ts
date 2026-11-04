import { ShopRole } from './shop-member.js';

export interface Shop {
    id: string;
    name: string;
    description: string | null;
    created_at: Date | string;
    updated_at: Date | string;
}

export interface CreateShopParams {
    name: string;
    description?: string | null;
}

export interface UpdateShopParams {
    name?: string;
    description?: string | null;
}

export interface UserShop extends Shop {
    role: ShopRole;
}

import { ShopRole } from './shop-member.js';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

export interface ShopInvitation {
    id: string;
    shop_id: string;
    email: string;
    role: ShopRole;
    token: string;
    status: InvitationStatus;
    expires_at: Date | string;
    created_at: Date | string;
    updated_at: Date | string;
}

export interface CreateShopInvitationParams {
    shop_id: string;
    email: string;
    role: ShopRole;
    token: string;
    expires_at: Date;
    status?: InvitationStatus;
}

export interface UpdateShopInvitationParams {
    token?: string;
    role?: ShopRole;
    status?: InvitationStatus;
    expires_at?: Date;
}

import {
    ShopInvitation,
    CreateShopInvitationParams,
    UpdateShopInvitationParams,
} from '../entities/shop-invitation.js';

export interface ShopInvitationRepository {
    create(params: CreateShopInvitationParams): Promise<ShopInvitation>;
    findById(id: string): Promise<ShopInvitation | null>;
    findByToken(token: string): Promise<ShopInvitation | null>;
    findPendingByShopIdAndEmail(
        shopId: string,
        email: string,
    ): Promise<ShopInvitation | null>;
    findPendingByShopId(shopId: string): Promise<ShopInvitation[]>;
    update(
        id: string,
        params: UpdateShopInvitationParams,
    ): Promise<ShopInvitation>;
}

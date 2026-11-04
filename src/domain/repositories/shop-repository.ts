import {
    Shop,
    CreateShopParams,
    UpdateShopParams,
    UserShop,
} from '../entities/shop.js';

export interface ShopRepository {
    create(params: CreateShopParams): Promise<Shop>;
    findById(shopId: string): Promise<Shop | null>;
    findByUserId(userId: string): Promise<UserShop[]>;
    update(shopId: string, params: UpdateShopParams): Promise<Shop>;
    delete(shopId: string): Promise<Shop>;
}

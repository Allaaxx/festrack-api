import { BundleItem, CreateBundleItemParams } from '../entities/bundle-item.js';

export interface BundleItemRepository {
    createMany(
        items: CreateBundleItemParams[],
        tx?: any,
    ): Promise<BundleItem[]>;
    findByBundleId(bundleProductId: string): Promise<BundleItem[]>;
    isComponentInAnyBundle(productId: string): Promise<boolean>;
    deleteByBundleId?(bundleProductId: string): Promise<void>;
}

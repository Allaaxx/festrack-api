import { BundleItem, CreateBundleItemParams } from '../entities/bundle-item.js';

export interface BundleItemRepository {
    createMany(items: CreateBundleItemParams[]): Promise<BundleItem[]>;
    findByBundleId(bundleProductId: string): Promise<BundleItem[]>;
    findByBundleIds?(bundleProductIds: string[]): Promise<BundleItem[]>;
    isComponentInAnyBundle(productId: string): Promise<boolean>;
    deleteByBundleId?(bundleProductId: string): Promise<void>;
}

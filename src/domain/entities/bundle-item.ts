import { Product } from './product.js';

export interface BundleItem {
    id: string;
    bundleProductId: string;
    bundle_product_id: string;
    productId: string;
    product_id: string;
    quantity: number;
    componentProduct?: Product;
    product?: Product;
    createdAt: Date | string;
    created_at: Date | string;
    updatedAt: Date | string;
    updated_at: Date | string;
}

export interface CreateBundleItemParams {
    bundle_product_id?: string;
    bundleProductId?: string;
    product_id?: string;
    productId?: string;
    quantity: number;
}

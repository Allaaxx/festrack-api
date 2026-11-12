import { ProductWithStock } from './product.js';
import { Stock } from './stock.js';

export interface BundleItem {
    id: string;
    bundleProductId: string;
    bundle_product_id: string;
    productId: string;
    product_id: string;
    quantity: number;
    componentProduct?: ProductWithStock;
    product?: ProductWithStock;
    stock?: Stock | null;
    available_stock?: number | null;
    availableStock?: number | null;
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

import { Stock } from './stock.js';
import { BundleItem } from './bundle-item.js';

export type ProductType = 'service' | 'sale' | 'rent';

export interface Product {
    id: string;
    shop_id: string;
    name: string;
    slug: string;
    type: ProductType;
    price: string | number;
    description: string | null;
    images: string[];
    is_bundle: boolean;
    isActive?: boolean;
    is_active?: boolean;
    created_at: Date | string;
    updated_at: Date | string;
}

export interface ProductWithStock extends Product {
    stock: Stock | null;
    available_stock?: number | null;
    availableStock?: number | null;
    bundle_items?: BundleItem[] | null;
    bundleItems?: BundleItem[] | null;
}

export interface CreateProductParams {
    shop_id: string;
    name: string;
    slug: string;
    type: ProductType;
    price: string | number;
    description?: string | null;
    images?: string[];
    is_bundle?: boolean;
    isBundle?: boolean;
    isActive?: boolean;
    is_active?: boolean;
}

export interface UpdateProductParams {
    name?: string;
    slug?: string;
    type?: ProductType;
    price?: string | number;
    description?: string | null;
    images?: string[];
    isActive?: boolean;
    is_active?: boolean;
}

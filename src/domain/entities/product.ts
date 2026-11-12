import { Stock } from './stock.js';

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
    created_at: Date | string;
    updated_at: Date | string;
}

export interface ProductWithStock extends Product {
    stock: Stock | null;
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
}

export interface UpdateProductParams {
    name?: string;
    slug?: string;
    type?: ProductType;
    price?: string | number;
    description?: string | null;
    images?: string[];
}

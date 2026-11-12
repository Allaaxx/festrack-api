import {
    Product,
    ProductWithStock,
    CreateProductParams,
    UpdateProductParams,
    ProductType,
} from '../entities/product.js';

export interface ProductRepository {
    create(params: CreateProductParams): Promise<Product>;
    findById(id: string): Promise<Product | null>;
    findByIdWithStock(id: string): Promise<ProductWithStock | null>;
    findBySlug(slug: string): Promise<Product | null>;
    findByShopId(
        shopId: string,
        filter?: { type?: ProductType },
    ): Promise<ProductWithStock[]>;
    update(id: string, params: UpdateProductParams): Promise<Product>;
    delete(id: string): Promise<Product>;
}

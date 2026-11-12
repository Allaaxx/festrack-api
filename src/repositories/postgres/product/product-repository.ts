import { and, desc, eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { products, stock } from '../../../db/postgres/schemas/index.js';
import { ProductNotFoundError } from '../../../errors/product.js';
import {
    Product,
    ProductWithStock,
    CreateProductParams,
    UpdateProductParams,
    ProductType,
    ProductRepository,
} from '../../../domain/index.js';

export type { ProductRepository };

const mapProduct = (p: typeof products.$inferSelect): Product => ({
    ...p,
    images: p.images ?? [],
});

export class PostgresProductRepository implements ProductRepository {
    constructor(private readonly database: Database = db) {}

    async create(params: CreateProductParams): Promise<Product> {
        const [createdProduct] = await this.database
            .insert(products)
            .values({
                shop_id: params.shop_id,
                name: params.name,
                slug: params.slug,
                type: params.type,
                price: params.price.toString(),
                description: params.description ?? null,
                images: params.images ?? [],
                is_bundle: params.is_bundle ?? false,
            })
            .returning();

        return mapProduct(createdProduct);
    }

    async findById(id: string): Promise<Product | null> {
        const [product] = await this.database
            .select()
            .from(products)
            .where(eq(products.id, id));

        return product ? mapProduct(product) : null;
    }

    async findByIdWithStock(id: string): Promise<ProductWithStock | null> {
        const rows = await this.database
            .select({
                product: products,
                stock: stock,
            })
            .from(products)
            .leftJoin(stock, eq(products.id, stock.product_id))
            .where(eq(products.id, id));

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            ...mapProduct(row.product),
            stock: row.stock ?? null,
        };
    }

    async findBySlug(slug: string): Promise<Product | null> {
        const [product] = await this.database
            .select()
            .from(products)
            .where(eq(products.slug, slug));

        return product ? mapProduct(product) : null;
    }

    async findByShopId(
        shopId: string,
        filter?: { type?: ProductType },
    ): Promise<ProductWithStock[]> {
        const conditions = [eq(products.shop_id, shopId)];
        if (filter?.type) {
            conditions.push(eq(products.type, filter.type));
        }

        const rows = await this.database
            .select({
                product: products,
                stock: stock,
            })
            .from(products)
            .leftJoin(stock, eq(products.id, stock.product_id))
            .where(and(...conditions))
            .orderBy(desc(products.created_at));

        return rows.map((row) => ({
            ...mapProduct(row.product),
            stock: row.stock ?? null,
        }));
    }

    async update(id: string, params: UpdateProductParams): Promise<Product> {
        const [updatedProduct] = await this.database
            .update(products)
            .set({
                ...params,
                price:
                    params.price !== undefined
                        ? params.price.toString()
                        : undefined,
            })
            .where(eq(products.id, id))
            .returning();

        if (!updatedProduct) {
            throw new ProductNotFoundError(id);
        }

        return mapProduct(updatedProduct);
    }

    async delete(id: string): Promise<Product> {
        const [deletedProduct] = await this.database
            .delete(products)
            .where(eq(products.id, id))
            .returning();

        if (!deletedProduct) {
            throw new ProductNotFoundError(id);
        }

        return mapProduct(deletedProduct);
    }
}

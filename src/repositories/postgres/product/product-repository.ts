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
import { txContext } from '../transaction-manager.js';

export type { ProductRepository };

const mapProduct = (p: typeof products.$inferSelect): Product => ({
    ...p,
    isActive: p.isActive,
    is_active: p.isActive,
    images: p.images ?? [],
});

export class PostgresProductRepository implements ProductRepository {
    constructor(private readonly database: Database = db) {}

    private getDb(tx?: any): Database {
        return (tx ?? txContext.getStore() ?? this.database) as Database;
    }

    async create(params: CreateProductParams, tx?: any): Promise<Product> {
        const dbInstance = this.getDb(tx);
        const [createdProduct] = await dbInstance
            .insert(products)
            .values({
                shop_id: params.shop_id,
                name: params.name,
                slug: params.slug,
                type: params.type,
                price: params.price.toString(),
                description: params.description ?? null,
                images: params.images ?? [],
                is_bundle: params.is_bundle ?? params.isBundle ?? false,
                isActive: params.isActive ?? params.is_active ?? true,
            })
            .returning();

        return mapProduct(createdProduct);
    }

    async findById(id: string): Promise<Product | null> {
        const dbInstance = this.getDb();
        const [product] = await dbInstance
            .select()
            .from(products)
            .where(eq(products.id, id));

        return product ? mapProduct(product) : null;
    }

    async findByIdWithStock(id: string): Promise<ProductWithStock | null> {
        const dbInstance = this.getDb();
        const rows = await dbInstance
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

    async findBySlug(shopId: string, slug: string): Promise<Product | null> {
        const dbInstance = this.getDb();
        const [product] = await dbInstance
            .select()
            .from(products)
            .where(and(eq(products.shop_id, shopId), eq(products.slug, slug)));

        return product ? mapProduct(product) : null;
    }

    async findByShopId(
        shopId: string,
        filter?: { type?: ProductType },
    ): Promise<ProductWithStock[]> {
        const dbInstance = this.getDb();
        const conditions = [eq(products.shop_id, shopId)];
        if (filter?.type) {
            conditions.push(eq(products.type, filter.type));
        }

        const rows = await dbInstance
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
        const dbInstance = this.getDb();
        const updateValues: Record<string, any> = {};
        if (params.name !== undefined) updateValues.name = params.name;
        if (params.slug !== undefined) updateValues.slug = params.slug;
        if (params.type !== undefined) updateValues.type = params.type;
        if (params.price !== undefined)
            updateValues.price = params.price.toString();
        if (params.description !== undefined)
            updateValues.description = params.description;
        if (params.images !== undefined) updateValues.images = params.images;
        if (params.isActive !== undefined || params.is_active !== undefined) {
            updateValues.isActive = params.isActive ?? params.is_active;
        }

        const [updatedProduct] = await dbInstance
            .update(products)
            .set(updateValues)
            .where(eq(products.id, id))
            .returning();

        if (!updatedProduct) {
            throw new ProductNotFoundError(id);
        }

        return mapProduct(updatedProduct);
    }

    async delete(id: string, tx?: any): Promise<Product> {
        const dbInstance = this.getDb(tx);
        const [deletedProduct] = await dbInstance
            .delete(products)
            .where(eq(products.id, id))
            .returning();

        if (!deletedProduct) {
            throw new ProductNotFoundError(id);
        }

        return mapProduct(deletedProduct);
    }
}

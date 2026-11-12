import { eq } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import { bundleItems, products } from '../../../db/postgres/schemas/index.js';
import {
    BundleItem,
    BundleItemRepository,
    CreateBundleItemParams,
    Product,
} from '../../../domain/index.js';

const mapProduct = (p: typeof products.$inferSelect): Product => ({
    ...p,
    images: p.images ?? [],
});

const mapBundleItem = (
    item: typeof bundleItems.$inferSelect,
    componentProduct?: Product,
): BundleItem => ({
    id: item.id,
    bundleProductId: item.bundle_product_id,
    bundle_product_id: item.bundle_product_id,
    productId: item.product_id,
    product_id: item.product_id,
    quantity: item.quantity,
    componentProduct,
    product: componentProduct,
    createdAt: item.created_at,
    created_at: item.created_at,
    updatedAt: item.updated_at,
    updated_at: item.updated_at,
});

export class PostgresBundleItemRepository implements BundleItemRepository {
    constructor(private readonly database: Database = db) {}

    async createMany(
        items: CreateBundleItemParams[],
        tx?: any,
    ): Promise<BundleItem[]> {
        if (items.length === 0) {
            return [];
        }

        const dbInstance = tx ?? this.database;
        const inserted = await dbInstance
            .insert(bundleItems)
            .values(
                items.map((item) => ({
                    bundle_product_id: (item.bundle_product_id ??
                        item.bundleProductId)!,
                    product_id: (item.product_id ?? item.productId)!,
                    quantity: item.quantity,
                })),
            )
            .returning();

        return inserted.map((row: typeof bundleItems.$inferSelect) =>
            mapBundleItem(row),
        );
    }

    async findByBundleId(bundleProductId: string): Promise<BundleItem[]> {
        const rows = await this.database
            .select({
                item: bundleItems,
                component: products,
            })
            .from(bundleItems)
            .leftJoin(products, eq(bundleItems.product_id, products.id))
            .where(eq(bundleItems.bundle_product_id, bundleProductId));

        return rows.map((r) =>
            mapBundleItem(
                r.item,
                r.component ? mapProduct(r.component) : undefined,
            ),
        );
    }

    async isComponentInAnyBundle(productId: string): Promise<boolean> {
        const [row] = await this.database
            .select({ id: bundleItems.id })
            .from(bundleItems)
            .where(eq(bundleItems.product_id, productId))
            .limit(1);

        return !!row;
    }

    async deleteByBundleId(bundleProductId: string): Promise<void> {
        await this.database
            .delete(bundleItems)
            .where(eq(bundleItems.bundle_product_id, bundleProductId));
    }
}

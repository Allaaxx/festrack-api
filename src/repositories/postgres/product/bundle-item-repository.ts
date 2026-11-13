import { eq, inArray } from 'drizzle-orm';
import { db, Database } from '../../../db/postgres/index.js';
import {
    bundleItems,
    products,
    stock,
} from '../../../db/postgres/schemas/index.js';
import {
    BundleItem,
    BundleItemRepository,
    CreateBundleItemParams,
    Product,
    ProductWithStock,
    Stock,
} from '../../../domain/index.js';
import { txContext } from '../transaction-manager.js';

const mapProduct = (p: typeof products.$inferSelect): Product => ({
    ...p,
    images: p.images ?? [],
});

const mapStock = (s: typeof stock.$inferSelect): Stock => {
    const available = s.quantity - s.reserved;
    return {
        id: s.id,
        product_id: s.product_id,
        quantity: s.quantity,
        reserved: s.reserved,
        available_stock: available,
        availableStock: available,
        updated_at: s.updated_at,
    };
};

const mapBundleItem = (
    item: typeof bundleItems.$inferSelect,
    componentProduct?: ProductWithStock,
    stockData?: Stock | null,
): BundleItem => {
    const effectiveStock = stockData ?? componentProduct?.stock ?? null;
    const available = effectiveStock
        ? effectiveStock.quantity - effectiveStock.reserved
        : componentProduct?.available_stock;

    return {
        id: item.id,
        bundleProductId: item.bundle_product_id,
        bundle_product_id: item.bundle_product_id,
        productId: item.product_id,
        product_id: item.product_id,
        quantity: item.quantity,
        componentProduct,
        product: componentProduct,
        stock: effectiveStock,
        available_stock: available,
        availableStock: available,
        createdAt: item.created_at,
        created_at: item.created_at,
        updatedAt: item.updated_at,
        updated_at: item.updated_at,
    };
};

export class PostgresBundleItemRepository implements BundleItemRepository {
    constructor(private readonly database: Database = db) {}

    async createMany(
        items: CreateBundleItemParams[],
        tx?: any,
    ): Promise<BundleItem[]> {
        if (items.length === 0) {
            return [];
        }

        const dbInstance = (tx ??
            txContext.getStore() ??
            this.database) as Database;
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
                stock: stock,
            })
            .from(bundleItems)
            .leftJoin(products, eq(bundleItems.product_id, products.id))
            .leftJoin(stock, eq(products.id, stock.product_id))
            .where(eq(bundleItems.bundle_product_id, bundleProductId));

        return rows.map((r) => {
            const stockData = r.stock ? mapStock(r.stock) : null;
            const componentProduct: ProductWithStock | undefined = r.component
                ? {
                      ...mapProduct(r.component),
                      stock: stockData,
                      available_stock: stockData
                          ? stockData.available_stock
                          : r.component.type === 'service'
                            ? undefined
                            : 0,
                      availableStock: stockData
                          ? stockData.availableStock
                          : r.component.type === 'service'
                            ? undefined
                            : 0,
                  }
                : undefined;

            return mapBundleItem(r.item, componentProduct, stockData);
        });
    }

    async findByBundleIds(bundleProductIds: string[]): Promise<BundleItem[]> {
        if (bundleProductIds.length === 0) {
            return [];
        }

        const rows = await this.database
            .select({
                item: bundleItems,
                component: products,
                stock: stock,
            })
            .from(bundleItems)
            .leftJoin(products, eq(bundleItems.product_id, products.id))
            .leftJoin(stock, eq(products.id, stock.product_id))
            .where(inArray(bundleItems.bundle_product_id, bundleProductIds));

        return rows.map((r) => {
            const stockData = r.stock ? mapStock(r.stock) : null;
            const componentProduct: ProductWithStock | undefined = r.component
                ? {
                      ...mapProduct(r.component),
                      stock: stockData,
                      available_stock: stockData
                          ? stockData.available_stock
                          : r.component.type === 'service'
                            ? undefined
                            : 0,
                      availableStock: stockData
                          ? stockData.availableStock
                          : r.component.type === 'service'
                            ? undefined
                            : 0,
                  }
                : undefined;

            return mapBundleItem(r.item, componentProduct, stockData);
        });
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

export interface ComponentStockItem {
    quantity: number;
    type?: string;
    isActive?: boolean;
    is_active?: boolean;
    stock?: {
        quantity: number;
        reserved: number;
    } | null;
    componentProduct?: {
        type?: string;
        isActive?: boolean;
        is_active?: boolean;
        stock?: {
            quantity: number;
            reserved: number;
        } | null;
    } | null;
    product?: {
        type?: string;
        isActive?: boolean;
        is_active?: boolean;
        stock?: {
            quantity: number;
            reserved: number;
        } | null;
    } | null;
}

/**
 * Dynamically computes available stock for virtual product bundles.
 * Formula: min(floor((stock.quantity - stock.reserved) / bundle_item.quantity)) across all component items.
 *
 * Rules:
 * - If bundle has no items, returns 0.
 * - If any component product has isActive === false, returns 0.
 * - Components with type === 'service' do not maintain physical stock and must NOT zero out bundle availability.
 * - If any physical component has zero or negative available stock (or missing stock), returns 0.
 * - Fractional results rounded down to nearest integer.
 */
export function calculateBundleAvailableStock(
    items: ComponentStockItem[] | null | undefined,
): number {
    if (!items || items.length === 0) {
        return 0;
    }

    let minAvailable = Infinity;

    for (const item of items) {
        if (!item || item.quantity <= 0) {
            return 0;
        }

        const isActive =
            item.componentProduct?.isActive ??
            item.componentProduct?.is_active ??
            item.product?.isActive ??
            item.product?.is_active ??
            item.isActive ??
            item.is_active;

        if (isActive === false) {
            return 0;
        }

        const compType =
            item.componentProduct?.type ?? item.product?.type ?? item.type;

        if (compType === 'service') {
            continue;
        }

        const componentStock =
            item.stock ?? item.componentProduct?.stock ?? item.product?.stock;

        if (!componentStock) {
            return 0;
        }

        const available = componentStock.quantity - componentStock.reserved;
        if (available <= 0) {
            return 0;
        }

        const possibleBundles = Math.floor(available / item.quantity);
        if (possibleBundles < minAvailable) {
            minAvailable = possibleBundles;
        }
    }

    return minAvailable === Infinity ? 0 : minAvailable;
}

/**
 * Calculates available stock for simple products.
 * Available stock = stock.quantity - stock.reserved.
 */
export function calculateSimpleProductAvailableStock(
    stock: { quantity: number; reserved: number } | null | undefined,
): number {
    if (!stock) {
        return 0;
    }
    return stock.quantity - stock.reserved;
}

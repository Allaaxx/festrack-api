export class ProductNotFoundError extends Error {
    constructor(productId: string) {
        super(`Product with id ${productId} not found.`);
        this.name = 'ProductNotFoundError';
    }
}

export class SlugAlreadyExistsError extends Error {
    constructor(slug: string) {
        super(`A product with slug '${slug}' already exists.`);
        this.name = 'SlugAlreadyExistsError';
    }
}

export class InvalidBundleComponentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidBundleComponentError';
    }
}

export class CannotDeleteProductInBundleError extends Error {
    constructor(productId: string) {
        super(
            `Product with id '${productId}' cannot be deleted because it is part of an active bundle.`,
        );
        this.name = 'CannotDeleteProductInBundleError';
    }
}

export class InvalidStockAdjustmentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidStockAdjustmentError';
    }
}

export class StockNotFoundError extends Error {
    constructor(productId: string) {
        super(`Stock for product '${productId}' not found.`);
        this.name = 'StockNotFoundError';
    }
}

export interface InsufficientStockDetail {
    productId: string;
    product_id?: string;
    productName?: string;
    product_name?: string;
    requestedQuantity: number;
    requested_quantity?: number;
    availableStock: number;
    available_stock?: number;
}

export class InsufficientStockError extends Error {
    readonly details: InsufficientStockDetail[];

    constructor(
        messageOrDetails:
            string | InsufficientStockDetail | InsufficientStockDetail[],
        details?: InsufficientStockDetail[] | InsufficientStockDetail,
    ) {
        let msg = 'Insufficient stock for one or more products.';
        let parsedDetails: InsufficientStockDetail[] = [];

        if (typeof messageOrDetails === 'string') {
            msg = messageOrDetails;
            if (details) {
                parsedDetails = Array.isArray(details) ? details : [details];
            }
        } else if (Array.isArray(messageOrDetails)) {
            parsedDetails = messageOrDetails;
            msg = `Insufficient stock for product(s): ${parsedDetails
                .map((d) => d.productId || d.product_id)
                .join(', ')}`;
        } else if (messageOrDetails && typeof messageOrDetails === 'object') {
            parsedDetails = [messageOrDetails];
            const pId =
                messageOrDetails.productId || messageOrDetails.product_id;
            const req =
                messageOrDetails.requestedQuantity ??
                messageOrDetails.requested_quantity;
            const avail =
                messageOrDetails.availableStock ??
                messageOrDetails.available_stock;
            msg = `Insufficient stock for product '${pId}'. Requested: ${req}, Available: ${avail}`;
        }

        super(msg);
        this.name = 'InsufficientStockError';
        this.details = parsedDetails.map((d) => ({
            productId: d.productId ?? d.product_id ?? '',
            product_id: d.product_id ?? d.productId ?? '',
            productName: d.productName ?? d.product_name,
            product_name: d.product_name ?? d.productName,
            requestedQuantity: d.requestedQuantity ?? d.requested_quantity ?? 0,
            requested_quantity:
                d.requested_quantity ?? d.requestedQuantity ?? 0,
            availableStock: d.availableStock ?? d.available_stock ?? 0,
            available_stock: d.available_stock ?? d.availableStock ?? 0,
        }));
    }
}

export interface InvalidRentalReturnDetail {
    productId?: string;
    product_id?: string;
    productName?: string;
    product_name?: string;
    returnedQuantity?: number;
    returned_quantity?: number;
    damagedQuantity?: number;
    damaged_quantity?: number;
    totalToCheckin?: number;
    total_to_checkin?: number;
    reservedStock?: number;
    reserved_stock?: number;
    reason?: string;
}

export class InvalidRentalReturnError extends Error {
    readonly details?: InvalidRentalReturnDetail[];

    constructor(
        messageOrDetails:
            string | InvalidRentalReturnDetail | InvalidRentalReturnDetail[],
        details?: InvalidRentalReturnDetail[] | InvalidRentalReturnDetail,
    ) {
        let msg = 'Invalid rental return.';
        let parsedDetails: InvalidRentalReturnDetail[] = [];

        if (typeof messageOrDetails === 'string') {
            msg = messageOrDetails;
            if (details) {
                parsedDetails = Array.isArray(details) ? details : [details];
            }
        } else if (Array.isArray(messageOrDetails)) {
            parsedDetails = messageOrDetails;
            msg = `Invalid rental return for product(s): ${parsedDetails
                .map((d) => d.productId || d.product_id)
                .join(', ')}`;
        } else if (messageOrDetails && typeof messageOrDetails === 'object') {
            parsedDetails = [messageOrDetails];
            const pId =
                messageOrDetails.productId || messageOrDetails.product_id;
            const reason = messageOrDetails.reason;
            msg = reason || `Invalid rental return for product '${pId}'.`;
        }

        super(msg);
        this.name = 'InvalidRentalReturnError';
        if (parsedDetails.length > 0) {
            this.details = parsedDetails.map((d) => ({
                productId: d.productId ?? d.product_id ?? '',
                product_id: d.product_id ?? d.productId ?? '',
                productName: d.productName ?? d.product_name,
                product_name: d.product_name ?? d.productName,
                returnedQuantity:
                    d.returnedQuantity ?? d.returned_quantity ?? 0,
                returned_quantity:
                    d.returned_quantity ?? d.returnedQuantity ?? 0,
                damagedQuantity: d.damagedQuantity ?? d.damaged_quantity ?? 0,
                damaged_quantity: d.damaged_quantity ?? d.damagedQuantity ?? 0,
                totalToCheckin: d.totalToCheckin ?? d.total_to_checkin,
                total_to_checkin: d.total_to_checkin ?? d.totalToCheckin,
                reservedStock: d.reservedStock ?? d.reserved_stock,
                reserved_stock: d.reserved_stock ?? d.reservedStock,
                reason: d.reason,
            }));
        }
    }
}

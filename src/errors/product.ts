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

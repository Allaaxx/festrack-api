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

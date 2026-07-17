export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized.');
        this.name = 'Unauthorized';
    }
}

export class ForbiddenError extends Error {
    constructor() {
        super('Forbidden.');
        this.name = 'ForbiddenError';
    }
}

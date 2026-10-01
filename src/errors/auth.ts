export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized.');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends Error {
    constructor() {
        super('Forbidden.');
        this.name = 'ForbiddenError';
    }
}

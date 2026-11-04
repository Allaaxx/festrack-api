export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized.');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends Error {
    constructor(message: string = 'Forbidden.') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

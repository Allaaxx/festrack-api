export class EventTagConflictError extends Error {
    constructor(slug: string) {
        super(`Event tag with slug '${slug}' already exists.`);
        this.name = 'EventTagConflictError';
    }
}

export class EventTagSlugAlreadyExistsError extends EventTagConflictError {
    constructor(slug: string) {
        super(slug);
        this.name = 'EventTagSlugAlreadyExistsError';
    }
}

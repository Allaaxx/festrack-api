export class EventTagConflictError extends Error {
    constructor(slug: string) {
        super(`Event tag with slug '${slug}' already exists.`);
        this.name = 'EventTagConflictError';
    }
}

export class InvalidEventTagSlugError extends Error {
    constructor(message = 'Event tag slug cannot be empty or invalid.') {
        super(message);
        this.name = 'InvalidEventTagSlugError';
    }
}

export class EventTagNotFoundError extends Error {
    constructor(id: string) {
        super(`Event tag with id '${id}' not found.`);
        this.name = 'EventTagNotFoundError';
    }
}

export class CannotDeleteSystemTagError extends Error {
    constructor(message = 'Cannot delete system default event tag.') {
        super(message);
        this.name = 'CannotDeleteSystemTagError';
    }
}

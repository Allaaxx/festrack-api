export class EventNotFoundError extends Error {
    constructor(eventId) {
        super(`Event with id ${eventId} not found.`);
        this.name = 'EventNotFoundError';
    }
}

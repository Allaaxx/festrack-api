export class EventNotFoundError extends Error {
    constructor(eventId: string) {
        super(`Event with id ${eventId} not found.`);
        this.name = 'EventNotFoundError';
    }
}

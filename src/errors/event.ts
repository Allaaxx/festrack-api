export class EventNotFoundError extends Error {
    constructor(eventId: string) {
        super(`Event with id ${eventId} not found.`);
        this.name = 'EventNotFoundError';
    }
}

export class GoogleCalendarNotFoundError extends Error {
    public readonly status: number;

    constructor(status: number, message?: string) {
        super(message ?? `Google Calendar event not found (${status}).`);
        this.name = 'GoogleCalendarNotFoundError';
        this.status = status;
    }
}

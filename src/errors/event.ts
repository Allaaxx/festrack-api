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

export class InvalidEventDateRangeError extends Error {
    constructor(
        message = 'End date must be greater than or equal to start date.',
    ) {
        super(message);
        this.name = 'InvalidEventDateRangeError';
    }
}

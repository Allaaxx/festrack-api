import {
    CreateEventController,
    DeleteEventController,
    GetEventByIdController,
    GetEventsByUserIdController,
    UpdateEventController,
} from '../../controllers/index.js';
import {
    makeCreateEventController,
    makeDeleteEventController,
    makeGetEventByIdController,
    makeGetEventsByUserIdController,
    makeUpdateEventController,
} from './event.js';

describe('Event Controller Factory', () => {
    it('should return a valid CreateEventController instance', () => {
        expect(makeCreateEventController()).toBeInstanceOf(
            CreateEventController,
        );
    });

    it('should return a valid GetEventsByUserIdController instance', () => {
        expect(makeGetEventsByUserIdController()).toBeInstanceOf(
            GetEventsByUserIdController,
        );
    });

    it('should return a valid GetEventByIdController instance', () => {
        expect(makeGetEventByIdController()).toBeInstanceOf(
            GetEventByIdController,
        );
    });

    it('should return a valid UpdateEventController instance', () => {
        expect(makeUpdateEventController()).toBeInstanceOf(
            UpdateEventController,
        );
    });

    it('should return a valid DeleteEventController instance', () => {
        expect(makeDeleteEventController()).toBeInstanceOf(
            DeleteEventController,
        );
    });
});

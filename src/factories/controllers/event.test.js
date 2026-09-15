import { CreateEventController } from '../../controllers/index.js';
import { makeCreateEventController } from './event.js';

describe('Event Controller Factory', () => {
    it('should return a valid CreateEventController instance', () => {
        expect(makeCreateEventController()).toBeInstanceOf(
            CreateEventController,
        );
    });
});

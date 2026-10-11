import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { event, user } from '../../tests/index.js';
import { DeleteEventUseCase } from './delete-event.js';
import { Event, EventRepository } from '../../domain/index.js';

describe('Delete Event Use Case', () => {
    class EventRepositoryStub implements Pick<
        EventRepository,
        'findById' | 'delete'
    > {
        async findById(_id: string): Promise<Event | null> {
            return { ...event, user_id: user.id };
        }

        async delete(_id: string): Promise<Event> {
            return { ...event, user_id: user.id };
        }
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const sut = new DeleteEventUseCase(eventRepository);

        return {
            sut,
            eventRepository,
        };
    };

    it('should delete event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(event.id, user.id);

        expect(result).toEqual({ ...event, user_id: user.id });
    });

    it('should call EventRepository.findById with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const spy = jest.spyOn(eventRepository, 'findById');

        await sut.execute(event.id, user.id);

        expect(spy).toHaveBeenCalledWith(event.id);
    });

    it('should call EventRepository.delete with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const spy = jest.spyOn(eventRepository, 'delete');

        await sut.execute(event.id, user.id);

        expect(spy).toHaveBeenCalledWith(event.id);
    });

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            user_id: 'other_user_id',
        });

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should throw if EventRepository.findById throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if EventRepository.delete throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'delete').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow();
    });

    it('should delete Google Calendar event when sync is enabled and event has google_event_id', async () => {
        const eventRepository = new EventRepositoryStub();
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                ...user,
                google_calendar_sync_enabled: true,
            }),
        };
        const calendarAdapter = {
            delete: jest.fn().mockResolvedValue(undefined),
        };

        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            user_id: user.id,
            google_event_id: 'g-event-to-delete',
        });

        const sut = new DeleteEventUseCase(
            eventRepository,
            userRepository as any,
            calendarAdapter,
        );

        await sut.execute(event.id, user.id);

        expect(calendarAdapter.delete).toHaveBeenCalledWith(
            user.id,
            'g-event-to-delete',
        );
    });

    it('should bypass Google Calendar delete when event has no google_event_id', async () => {
        const eventRepository = new EventRepositoryStub();
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                ...user,
                google_calendar_sync_enabled: true,
            }),
        };
        const calendarAdapter = {
            delete: jest.fn(),
        };

        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            user_id: user.id,
            google_event_id: null,
        });

        const sut = new DeleteEventUseCase(
            eventRepository,
            userRepository as any,
            calendarAdapter,
        );

        await sut.execute(event.id, user.id);

        expect(calendarAdapter.delete).not.toHaveBeenCalled();
    });

    it('should bypass Google Calendar delete when sync is disabled', async () => {
        const eventRepository = new EventRepositoryStub();
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                ...user,
                google_calendar_sync_enabled: false,
            }),
        };
        const calendarAdapter = {
            delete: jest.fn(),
        };

        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            user_id: user.id,
            google_event_id: 'g-event-to-delete',
        });

        const sut = new DeleteEventUseCase(
            eventRepository,
            userRepository as any,
            calendarAdapter,
        );

        await sut.execute(event.id, user.id);

        expect(calendarAdapter.delete).not.toHaveBeenCalled();
    });

    it('should tolerate Google Calendar delete failure and still delete event in Festrack (non-blocking resilience)', async () => {
        const eventRepository = new EventRepositoryStub();
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                ...user,
                google_calendar_sync_enabled: true,
            }),
        };
        const calendarAdapter = {
            delete: jest.fn().mockRejectedValue(new Error('Google 500 error')),
        };

        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            user_id: user.id,
            google_event_id: 'g-event-to-delete',
        });

        const sut = new DeleteEventUseCase(
            eventRepository,
            userRepository as any,
            calendarAdapter,
        );

        const result = await sut.execute(event.id, user.id);

        expect(result).toBeDefined();
        expect(calendarAdapter.delete).toHaveBeenCalled();
    });
});

import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { event, user } from '../../tests/index.js';
import { UpdateEventUseCase } from './update-event.js';
import {
    Event,
    UpdateEventParams,
    EventRepository,
} from '../../domain/index.js';

describe('Update Event Use Case', () => {
    const updateParams: UpdateEventParams = {
        name: 'Updated Event Name',
    };

    class EventRepositoryStub
        implements Pick<EventRepository, 'findById' | 'update'>
    {
        async findById(_id: string): Promise<Event | null> {
            return { ...event, user_id: user.id };
        }

        async update(
            _eventId: string,
            _updateEventParams: UpdateEventParams,
        ): Promise<Event> {
            return { ...event, user_id: user.id, ...updateParams };
        }
    }

    const makeSut = () => {
        const eventRepository = new EventRepositoryStub();
        const sut = new UpdateEventUseCase(eventRepository);

        return {
            sut,
            eventRepository,
        };
    };

    it('should update event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(event.id, user.id, updateParams);

        expect(result).toEqual({ ...event, user_id: user.id, ...updateParams });
    });

    it('should call EventRepository.findById with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const spy = jest.spyOn(eventRepository, 'findById');

        await sut.execute(event.id, user.id, updateParams);

        expect(spy).toHaveBeenCalledWith(event.id);
    });

    it('should call EventRepository.update with correct params', async () => {
        const { sut, eventRepository } = makeSut();
        const spy = jest.spyOn(eventRepository, 'update');

        await sut.execute(event.id, user.id, updateParams);

        expect(spy).toHaveBeenCalledWith(event.id, updateParams);
    });

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce(null);

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockResolvedValueOnce({
            ...event,
            user_id: 'other_user_id',
        });

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should throw if EventRepository.findById throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'findById').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if EventRepository.update throws', async () => {
        const { sut, eventRepository } = makeSut();
        jest.spyOn(eventRepository, 'update').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow();
    });
});

import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { event, user } from '../../tests/index.js';
import { DeleteEventUseCase } from './delete-event.js';

describe('Delete Event Use Case', () => {
    class EventRepositoryStub {
        async findById() {
            return { ...event, user_id: user.id };
        }

        async delete() {
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
});

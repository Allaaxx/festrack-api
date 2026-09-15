import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { event, user } from '../../tests/index.js';
import { DeleteEventUseCase } from './delete-event.js';

describe('Delete Event Use Case', () => {
    class GetEventByIdRepositoryStub {
        async execute() {
            return { ...event, user_id: user.id };
        }
    }

    class DeleteEventRepositoryStub {
        async execute() {
            return { ...event, user_id: user.id };
        }
    }

    const makeSut = () => {
        const getEventByIdRepository = new GetEventByIdRepositoryStub();
        const deleteEventRepository = new DeleteEventRepositoryStub();
        const sut = new DeleteEventUseCase(
            getEventByIdRepository,
            deleteEventRepository,
        );

        return {
            sut,
            getEventByIdRepository,
            deleteEventRepository,
        };
    };

    it('should delete event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(event.id, user.id);

        expect(result).toEqual({ ...event, user_id: user.id });
    });

    it('should call GetEventByIdRepository with correct params', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        const spy = jest.spyOn(getEventByIdRepository, 'execute');

        await sut.execute(event.id, user.id);

        expect(spy).toHaveBeenCalledWith(event.id);
    });

    it('should call DeleteEventRepository with correct params', async () => {
        const { sut, deleteEventRepository } = makeSut();
        const spy = jest.spyOn(deleteEventRepository, 'execute');

        await sut.execute(event.id, user.id);

        expect(spy).toHaveBeenCalledWith(event.id);
    });

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce({
            ...event,
            user_id: 'other_user_id',
        });

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should throw if GetEventByIdRepository throws', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if DeleteEventRepository throws', async () => {
        const { sut, deleteEventRepository } = makeSut();
        jest.spyOn(deleteEventRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow();
    });
});

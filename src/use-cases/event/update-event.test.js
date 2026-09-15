import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { event, user } from '../../tests/index.js';
import { UpdateEventUseCase } from './update-event.js';

describe('Update Event Use Case', () => {
    const updateParams = {
        name: 'Updated Event Name',
    };

    class GetEventByIdRepositoryStub {
        async execute() {
            return { ...event, user_id: user.id };
        }
    }

    class UpdateEventRepositoryStub {
        async execute() {
            return { ...event, user_id: user.id, ...updateParams };
        }
    }

    const makeSut = () => {
        const getEventByIdRepository = new GetEventByIdRepositoryStub();
        const updateEventRepository = new UpdateEventRepositoryStub();
        const sut = new UpdateEventUseCase(
            getEventByIdRepository,
            updateEventRepository,
        );

        return {
            sut,
            getEventByIdRepository,
            updateEventRepository,
        };
    };

    it('should update event successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(event.id, user.id, updateParams);

        expect(result).toEqual({ ...event, user_id: user.id, ...updateParams });
    });

    it('should call GetEventByIdRepository with correct params', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        const spy = jest.spyOn(getEventByIdRepository, 'execute');

        await sut.execute(event.id, user.id, updateParams);

        expect(spy).toHaveBeenCalledWith(event.id);
    });

    it('should call UpdateEventRepository with correct params', async () => {
        const { sut, updateEventRepository } = makeSut();
        const spy = jest.spyOn(updateEventRepository, 'execute');

        await sut.execute(event.id, user.id, updateParams);

        expect(spy).toHaveBeenCalledWith(event.id, updateParams);
    });

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw ForbiddenError if event belongs to another user', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce({
            ...event,
            user_id: 'other_user_id',
        });

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow(new ForbiddenError());
    });

    it('should throw if GetEventByIdRepository throws', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if UpdateEventRepository throws', async () => {
        const { sut, updateEventRepository } = makeSut();
        jest.spyOn(updateEventRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(event.id, user.id, updateParams);

        await expect(promise).rejects.toThrow();
    });
});

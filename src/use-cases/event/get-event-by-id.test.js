import { EventNotFoundError } from '../../errors/event.js';
import { ForbiddenError } from '../../errors/index.js';
import { event, user } from '../../tests/index.js';
import { GetEventByIdUseCase } from './get-event-by-id.js';

describe('Get Event By Id Use Case', () => {
    class GetEventByIdRepositoryStub {
        async execute() {
            return { ...event, user_id: user.id };
        }
    }

    const makeSut = () => {
        const getEventByIdRepository = new GetEventByIdRepositoryStub();
        const sut = new GetEventByIdUseCase(getEventByIdRepository);

        return {
            sut,
            getEventByIdRepository,
        };
    };

    it('should get event by id successfully', async () => {
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

    it('should throw EventNotFoundError if event is not found', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce(
            null,
        );

        const promise = sut.execute(event.id, user.id);

        await expect(promise).rejects.toThrow(new EventNotFoundError(event.id));
    });

    it('should throw ForbiddenError if event does not belong to user', async () => {
        const { sut, getEventByIdRepository } = makeSut();
        jest.spyOn(getEventByIdRepository, 'execute').mockResolvedValueOnce({
            ...event,
            user_id: 'another-user-id',
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
});

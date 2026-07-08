import { faker } from '@faker-js/faker';
import { user } from '../../tests/index.js';
import { GetUserByIdUseCase } from './get-user-by-id.js';

describe('Get User By Id Use Case', () => {
    class GetUserByIdRepositoryStub {
        async execute() {
            return user;
        }
    }

    const makeSut = () => {
        const getUserByIdRepository = new GetUserByIdRepositoryStub();
        const sut = new GetUserByIdUseCase(getUserByIdRepository);

        return {
            sut,
            getUserByIdRepository,
        };
    };

    it('should get user by id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid());

        expect(result).toEqual(user);
    });

    it('should call GetUserByIdRepository with correct params', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        const executeSpy = jest.spyOn(getUserByIdRepository, 'execute');
        const userId = faker.string.uuid();

        await sut.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should throw if GetUserByIdRepository throws', async () => {
        const { sut, getUserByIdRepository } = makeSut();
        jest.spyOn(getUserByIdRepository, 'execute').mockRejectedValue(
            new Error(),
        );

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

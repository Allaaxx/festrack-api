import { faker } from '@faker-js/faker';
import { user } from '../../tests/index.js';
import { GetUserByIdUseCase } from './get-user-by-id.js';

describe('Get User By Id Use Case', () => {
    class UserRepositoryStub {
        async findById() {
            return user;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const sut = new GetUserByIdUseCase(userRepository);

        return {
            sut,
            userRepository,
        };
    };

    it('should get user by id successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid());

        expect(result).toEqual(user);
    });

    it('should call userRepository.findById with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const executeSpy = jest.spyOn(userRepository, 'findById');
        const userId = faker.string.uuid();

        await sut.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should throw if userRepository.findById throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValue(new Error());

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

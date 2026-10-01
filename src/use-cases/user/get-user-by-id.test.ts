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
        const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

        return {
            getUserByIdUseCase,
            userRepository,
        };
    };

    it('should get user by id successfully', async () => {
        const { getUserByIdUseCase } = makeSut();

        const result = await getUserByIdUseCase.execute(faker.string.uuid());

        expect(result).toEqual(user);
    });

    it('should call userRepository.findById with correct params', async () => {
        const { getUserByIdUseCase, userRepository } = makeSut();
        const executeSpy = jest.spyOn(userRepository, 'findById');
        const userId = faker.string.uuid();

        await getUserByIdUseCase.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should throw if userRepository.findById throws', async () => {
        const { getUserByIdUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockRejectedValue(new Error());

        const promise = getUserByIdUseCase.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

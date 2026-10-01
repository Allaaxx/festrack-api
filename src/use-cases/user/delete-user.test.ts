import { faker } from '@faker-js/faker';
import { user } from '../../tests/index.js';
import { DeleteUserUseCase } from './delete-user.js';
import { User } from '../../domain/entities/user.js';

describe('Delete User Use Case', () => {
    class UserRepositoryStub {
        async delete(): Promise<User> {
            return user;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const deleteUserUseCase = new DeleteUserUseCase(userRepository);

        return {
            deleteUserUseCase,
            userRepository,
        };
    };

    it('should successfully delete a user', async () => {
        const { deleteUserUseCase } = makeSut();

        const deletedUser = await deleteUserUseCase.execute(faker.string.uuid());

        expect(deletedUser).toEqual(user);
    });

    it('should call userRepository.delete with correct params', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        const executeSpy = jest.spyOn(userRepository, 'delete');
        const userId = faker.string.uuid();

        await deleteUserUseCase.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should throw if userRepository.delete throws', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'delete').mockRejectedValueOnce(new Error());

        const promise = deleteUserUseCase.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

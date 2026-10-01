import { faker } from '@faker-js/faker';
import { user } from '../../tests';
import { DeleteUserUseCase } from './delete-user.js';

describe('Delete User Use Case', () => {
    class UserRepositoryStub {
        async delete() {
            return user;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const sut = new DeleteUserUseCase(userRepository);

        return {
            sut,
            userRepository,
        };
    };

    it('should successfully delete a user', async () => {
        const { sut } = makeSut();

        const deletedUser = await sut.execute(faker.string.uuid());

        expect(deletedUser).toEqual(user);
    });

    it('should call userRepository.delete with correct params ', async () => {
        const { sut, userRepository } = makeSut();
        const executeSpy = jest.spyOn(userRepository, 'delete');
        const userId = faker.string.uuid();

        await sut.execute(userId);

        expect(executeSpy).toHaveBeenCalledWith(userId);
    });

    it('should throw if userRepository.delete throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'delete').mockRejectedValueOnce(new Error());

        const promise = sut.execute(faker.string.uuid());

        await expect(promise).rejects.toThrow();
    });
});

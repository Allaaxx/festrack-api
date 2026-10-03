import { faker } from '@faker-js/faker';
import { user } from '../../tests/index.js';
import { DeleteUserUseCase } from './delete-user.js';
import { User, UserAccount } from '../../domain/entities/user.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';
import { PasswordVerifier } from '../../domain/adapters/password-verifier.js';

describe('Delete User Use Case', () => {
    const mockUserAccount: UserAccount = {
        id: faker.string.uuid(),
        userId: user.id,
        providerId: 'credential',
        accountId: user.email,
        password: 'hashed-password-123',
    };

    class UserRepositoryStub {
        async findById(_userId: string): Promise<User | null> {
            return user;
        }

        async listAccounts(_userId: string): Promise<UserAccount[]> {
            return [mockUserAccount];
        }

        async delete(_userId: string): Promise<User> {
            return user;
        }
    }

    class PasswordVerifierStub implements PasswordVerifier {
        async verify(_password: string, _hash: string): Promise<boolean> {
            return true;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const passwordVerifier = new PasswordVerifierStub();
        const deleteUserUseCase = new DeleteUserUseCase(
            userRepository,
            passwordVerifier,
        );

        return {
            deleteUserUseCase,
            userRepository,
            passwordVerifier,
        };
    };

    it('should successfully delete a user when password is correct', async () => {
        const { deleteUserUseCase } = makeSut();

        const deletedUser = await deleteUserUseCase.execute(
            user.id,
            'correct-password',
        );

        expect(deletedUser).toEqual(user);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);

        const promise = deleteUserUseCase.execute(
            'non-existent-id',
            'any-password',
        );

        await expect(promise).rejects.toThrow(
            new UserNotFoundError('non-existent-id'),
        );
    });

    it('should throw InvalidPasswordError when credential account has no password hash', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'listAccounts').mockResolvedValueOnce([
            {
                ...mockUserAccount,
                password: null,
            },
        ]);

        const promise = deleteUserUseCase.execute(user.id, 'any-password');

        await expect(promise).rejects.toThrow(InvalidPasswordError);
    });

    it('should throw InvalidPasswordError when user has no credential account', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'listAccounts').mockResolvedValueOnce([
            {
                ...mockUserAccount,
                providerId: 'google',
                password: null,
            },
        ]);

        const promise = deleteUserUseCase.execute(user.id, 'any-password');

        await expect(promise).rejects.toThrow(InvalidPasswordError);
    });

    it('should throw InvalidPasswordError when password verification fails', async () => {
        const { deleteUserUseCase, passwordVerifier } = makeSut();
        jest.spyOn(passwordVerifier, 'verify').mockResolvedValueOnce(false);

        const promise = deleteUserUseCase.execute(user.id, 'wrong-password');

        await expect(promise).rejects.toThrow(InvalidPasswordError);
    });

    it('should call passwordVerifier.verify with correct params', async () => {
        const { deleteUserUseCase, passwordVerifier } = makeSut();
        const verifySpy = jest.spyOn(passwordVerifier, 'verify');

        await deleteUserUseCase.execute(user.id, 'my-password');

        expect(verifySpy).toHaveBeenCalledWith(
            'my-password',
            'hashed-password-123',
        );
    });

    it('should call userRepository.delete with correct params', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        const executeSpy = jest.spyOn(userRepository, 'delete');

        await deleteUserUseCase.execute(user.id, 'my-password');

        expect(executeSpy).toHaveBeenCalledWith(user.id);
    });

    it('should throw if userRepository.delete throws', async () => {
        const { deleteUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'delete').mockRejectedValueOnce(
            new Error('DB Error'),
        );

        const promise = deleteUserUseCase.execute(user.id, 'my-password');

        await expect(promise).rejects.toThrow('DB Error');
    });
});

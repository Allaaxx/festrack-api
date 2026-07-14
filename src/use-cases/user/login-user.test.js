import { LoginUserUseCase } from './login-user';
import { user } from '../../tests/fixtures/user.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user';

describe('Login User Use Case', () => {
    class GetUserByEmailRepositoryStub {
        async execute() {
            return user;
        }
    }

    class PasswordComparatorAdapterStub {
        async execute() {
            return true;
        }
    }

    const makeSut = () => {
        const getUserByEmailRepositoryStub = new GetUserByEmailRepositoryStub();
        const passwordComparatorAdapterStub =
            new PasswordComparatorAdapterStub();
        const sut = new LoginUserUseCase(
            getUserByEmailRepositoryStub,
            passwordComparatorAdapterStub,
        );

        return {
            sut,
            getUserByEmailRepositoryStub,
            passwordComparatorAdapterStub,
        };
    };

    it('should throw UserNotFoundError if user is not found', async () => {
        const { sut, getUserByEmailRepositoryStub } = makeSut();
        import.meta.jest
            .spyOn(getUserByEmailRepositoryStub, 'execute')
            .mockResolvedValueOnce(null);
        const promise = sut.execute('any_email', 'any_password');
        await expect(promise).rejects.toThrow(new UserNotFoundError());
    });

    it('should throw InvalidPasswordError if password is not valid', async () => {
        const { sut, passwordComparatorAdapterStub } = makeSut();
        import.meta.jest
            .spyOn(passwordComparatorAdapterStub, 'execute')
            .mockReturnValue(false);
        const promise = sut.execute('any_email', 'any_password');
        await expect(promise).rejects.toThrow(new InvalidPasswordError());
    });
});

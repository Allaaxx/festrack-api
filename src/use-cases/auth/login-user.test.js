import { LoginUserUseCase } from './login-user';
import { user } from '../../tests/fixtures/user.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';

describe('Login User Use Case', () => {
    class UserRepositoryStub {
        async findByEmail() {
            return user;
        }
    }

    class PasswordComparatorAdapterStub {
        async execute() {
            return true;
        }
    }

    class TokensGeneratorAdapterStub {
        execute() {
            return {
                accessToken: 'any_access_token',
                refreshToken: 'any_refresh_token',
            };
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const passwordComparatorAdapter = new PasswordComparatorAdapterStub();
        const tokensGeneratorAdapter = new TokensGeneratorAdapterStub();
        const sut = new LoginUserUseCase(
            userRepository,
            passwordComparatorAdapter,
            tokensGeneratorAdapter,
        );

        return {
            sut,
            userRepository,
            passwordComparatorAdapter,
            tokensGeneratorAdapter,
        };
    };

    it('should throw UserNotFoundError if user is not found', async () => {
        const { sut, userRepository } = makeSut();
        import.meta.jest
            .spyOn(userRepository, 'findByEmail')
            .mockResolvedValueOnce(null);
        const promise = sut.execute('any_email', 'any_password');
        await expect(promise).rejects.toThrow(new UserNotFoundError());
    });

    it('should throw InvalidPasswordError if password is not valid', async () => {
        const { sut, passwordComparatorAdapter } = makeSut();
        import.meta.jest
            .spyOn(passwordComparatorAdapter, 'execute')
            .mockReturnValue(false);
        const promise = sut.execute('any_email', 'any_password');
        await expect(promise).rejects.toThrow(new InvalidPasswordError());
    });

    it('should return user with tokens', async () => {
        const { sut } = makeSut();
        const result = await sut.execute('any_email', 'any_password');
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
    });
});

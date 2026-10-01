import { LoginUserUseCase } from './login-user.js';
import { user } from '../../tests/fixtures/user.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';
import { User, UserRepository } from '../../domain/index.js';
import { PasswordComparator } from '../../adapters/password-comparator.js';
import {
    TokensGenerator,
    GeneratedTokens,
} from '../../adapters/tokens-generator.js';

describe('Login User Use Case', () => {
    class UserRepositoryStub implements Pick<UserRepository, 'findByEmail'> {
        async findByEmail(_email: string): Promise<User | null> {
            return user;
        }
    }

    class PasswordComparatorAdapterStub
        implements Pick<PasswordComparator, 'execute'>
    {
        async execute(_password: string, _hash: string): Promise<boolean> {
            return true;
        }
    }

    class TokensGeneratorAdapterStub
        implements Pick<TokensGenerator, 'execute'>
    {
        execute(_userId: string): GeneratedTokens {
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
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);
        const promise = sut.execute('any_email', 'any_password');
        await expect(promise).rejects.toThrow(new UserNotFoundError());
    });

    it('should throw InvalidPasswordError if password is not valid', async () => {
        const { sut, passwordComparatorAdapter } = makeSut();
        jest.spyOn(passwordComparatorAdapter, 'execute').mockResolvedValueOnce(
            false,
        );
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

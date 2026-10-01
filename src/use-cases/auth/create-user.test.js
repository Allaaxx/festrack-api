import { EmailAlreadyInUseError } from '../../errors/user.js';
import { user as fixtureUser } from '../../tests/index.js';
import { CreateUserUseCase } from './create-user.js';

describe('Create User Use Case', () => {
    const user = {
        ...fixtureUser,
        id: undefined,
    };

    class UserRepositoryStub {
        async findByEmail() {
            return null;
        }

        async create() {
            return {
                ...user,
                id: 'generated_id',
            };
        }
    }

    class PasswordHasherAdapterStub {
        async execute() {
            return 'hashed_password';
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
        const passwordHasherAdapter = new PasswordHasherAdapterStub();
        const tokensGeneratorAdapter = new TokensGeneratorAdapterStub();

        const sut = new CreateUserUseCase(
            userRepository,
            passwordHasherAdapter,
            tokensGeneratorAdapter,
        );

        return {
            sut,
            userRepository,
            passwordHasherAdapter,
        };
    };

    it('should successfully create a user', async () => {
        const { sut } = makeSut();

        const createdUser = await sut.execute(user);

        expect(createdUser).toBeTruthy();
        expect(createdUser.tokens.accessToken).toBe('any_access_token');
        expect(createdUser.tokens.refreshToken).toBe('any_refresh_token');
    });

    it('should throw an EmailAlreadyInUseError if findByEmail returns a user', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(user);

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow(
            new EmailAlreadyInUseError(user.email),
        );
    });

    it('should call PasswordHasherAdapter to cryptograph password', async () => {
        const { sut, passwordHasherAdapter, userRepository } = makeSut();
        const passwordHasherSpy = jest.spyOn(passwordHasherAdapter, 'execute');
        const createUserSpy = jest.spyOn(userRepository, 'create');

        await sut.execute(user);

        expect(passwordHasherSpy).toHaveBeenCalledWith(user.password);
        expect(createUserSpy).toHaveBeenCalledWith({
            ...user,
            password: 'hashed_password',
        });
    });

    it('should throw if findByEmail throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findByEmail').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if PasswordHasherAdapter throws', async () => {
        const { sut, passwordHasherAdapter } = makeSut();
        jest.spyOn(passwordHasherAdapter, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if userRepository.create throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'create').mockRejectedValueOnce(new Error());

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow();
    });
});

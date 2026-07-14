import { EmailAlreadyInUseError } from '../../errors/user.js';
import { user as fixtureUser } from '../../tests';
import { CreateUserUseCase } from './create-user.js';
describe('Create User Use Case', () => {
    const user = {
        ...fixtureUser,
        id: undefined,
    };
    class GetUserByEmailRepositoryStub {
        async execute() {
            return null;
        }
    }

    class CreateUserRepositoryStub {
        async execute() {
            return user;
        }
    }

    class PasswordHaserAdapterStub {
        async execute() {
            return 'hashed_password';
        }
    }

    class IdGeneratorAdapterStub {
        execute() {
            return 'generated_id';
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
        const getUserByEmailRepository = new GetUserByEmailRepositoryStub();
        const createUserRepository = new CreateUserRepositoryStub();
        const passwordHasherAdapter = new PasswordHaserAdapterStub();
        const idGeneratorAdapter = new IdGeneratorAdapterStub();
        const tokensGeneratorAdapter = new TokensGeneratorAdapterStub();

        const sut = new CreateUserUseCase(
            getUserByEmailRepository,
            createUserRepository,
            passwordHasherAdapter,
            idGeneratorAdapter,
            tokensGeneratorAdapter,
        );

        return {
            sut,
            getUserByEmailRepository,
            createUserRepository,
            passwordHasherAdapter,
            idGeneratorAdapter,
        };
    };

    it('should successfully create a user', async () => {
        const { sut } = makeSut();

        const createdUser = await sut.execute(user);

        expect(createdUser).toBeTruthy();
        expect(createdUser.tokens.accessToken).toBe('any_access_token');
        expect(createdUser.tokens.refreshToken).toBe('any_refresh_token');
    });

    it('should throw an EmailAlreadyInUseError if GetUserByEmailRepository returns a user', async () => {
        const { sut, getUserByEmailRepository } = makeSut();
        jest.spyOn(getUserByEmailRepository, 'execute').mockReturnValueOnce(
            user,
        );

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow(
            new EmailAlreadyInUseError(user.email),
        );
    });

    it('should call IdGeneratorAdapter to generate a random id', async () => {
        const { sut, idGeneratorAdapter, createUserRepository } = makeSut();
        const idGeneratorSpy = jest.spyOn(idGeneratorAdapter, 'execute');
        const createUserRepositorySpy = jest.spyOn(
            createUserRepository,
            'execute',
        );

        await sut.execute(user);

        expect(idGeneratorSpy).toHaveBeenCalled();
        expect(createUserRepositorySpy).toHaveBeenCalledWith({
            ...user,
            password: 'hashed_password',
            id: 'generated_id',
        });
    });

    it('should call PasswordHasherAdapter to cryptograph password', async () => {
        const { sut, passwordHasherAdapter, createUserRepository } = makeSut();
        const passwordHasherSpy = jest.spyOn(passwordHasherAdapter, 'execute');
        const createUserRepositorySpy = jest.spyOn(
            createUserRepository,
            'execute',
        );

        await sut.execute(user);

        expect(passwordHasherSpy).toHaveBeenCalledWith(user.password);
        expect(createUserRepositorySpy).toHaveBeenCalledWith({
            ...user,
            password: 'hashed_password',
            id: 'generated_id',
        });
    });

    it('should throw if GetUserByEmailRepository throws', async () => {
        const { sut, getUserByEmailRepository } = makeSut();
        jest.spyOn(getUserByEmailRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow();
    });

    it('should throw if IdGeneratorAdapter throws', async () => {
        const { sut, idGeneratorAdapter } = makeSut();
        jest.spyOn(idGeneratorAdapter, 'execute').mockImplementationOnce(
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

    it('should throw if CreateUserRepository throws', async () => {
        const { sut, createUserRepository } = makeSut();
        jest.spyOn(createUserRepository, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const promise = sut.execute(user);

        await expect(promise).rejects.toThrow();
    });
});

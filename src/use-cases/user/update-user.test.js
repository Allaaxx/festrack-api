import { faker } from '@faker-js/faker';
import { EmailAlreadyInUseError } from '../../errors/user.js';
import { user } from '../../tests';
import { UpdateUserUseCase } from './update-user.js';

describe('Update User Use Case', () => {
    class UserRepositoryStub {
        async findByEmail() {
            return null;
        }

        async update() {
            return user;
        }
    }

    class PasswordHasherAdapterStub {
        async execute() {
            return 'hashed_password';
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const passwordHasherAdapter = new PasswordHasherAdapterStub();
        const sut = new UpdateUserUseCase(
            userRepository,
            passwordHasherAdapter,
        );

        return {
            sut,
            userRepository,
            passwordHasherAdapter,
        };
    };

    it('should update user successfully (without email and password)', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(faker.string.uuid(), {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
        });

        expect(result).toBe(user);
    });

    it('should update user successfully (with email)', async () => {
        const { sut, userRepository } = makeSut();
        const findByEmailSpy = jest.spyOn(userRepository, 'findByEmail');

        const email = faker.internet.email();
        const result = await sut.execute(faker.string.uuid(), {
            email,
        });

        expect(findByEmailSpy).toHaveBeenCalledWith(email);
        expect(result).toBe(user);
    });

    it('should update user successfully (with password)', async () => {
        const { sut, passwordHasherAdapter } = makeSut();
        const passwordHasherAdapterSpy = jest.spyOn(
            passwordHasherAdapter,
            'execute',
        );

        const password = faker.internet.password();
        const result = await sut.execute(faker.string.uuid(), {
            password,
        });

        expect(passwordHasherAdapterSpy).toHaveBeenCalledWith(password);
        expect(result).toBe(user);
    });

    it('should throw EmailAlreadyInUseError if email is already in use', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(user);

        const promise = sut.execute(faker.string.uuid(), {
            email: user.email,
        });

        await expect(promise).rejects.toThrow(
            new EmailAlreadyInUseError(user.email),
        );
    });

    it('should call userRepository.update with correct params', async () => {
        const { sut, userRepository } = makeSut();
        const updateSpy = jest.spyOn(userRepository, 'update');

        const updateUserParams = {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            password: user.password,
        };

        await sut.execute(user.id, updateUserParams);

        expect(updateSpy).toHaveBeenCalledWith(user.id, {
            ...updateUserParams,
            password: 'hashed_password',
        });
    });

    it('should throw if findByEmail throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findByEmail').mockRejectedValue(
            new Error(),
        );

        const promise = sut.execute(faker.string.uuid(), {
            email: faker.internet.email(),
        });

        await expect(promise).rejects.toThrow();
    });

    it('should throw if PasswordHasherAdapter throws', async () => {
        const { sut, passwordHasherAdapter } = makeSut();
        jest.spyOn(passwordHasherAdapter, 'execute').mockRejectedValue(
            new Error(),
        );

        const promise = sut.execute(faker.string.uuid(), {
            password: faker.internet.password(),
        });

        await expect(promise).rejects.toThrow();
    });

    it('should throw if userRepository.update throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'update').mockRejectedValue(new Error());

        const promise = sut.execute(faker.string.uuid(), {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            password: user.password,
        });

        await expect(promise).rejects.toThrow();
    });
});

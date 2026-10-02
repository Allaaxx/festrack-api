import { describe, it, expect, jest } from 'bun:test';
import { faker } from '@faker-js/faker';
import { EmailAlreadyInUseError } from '../../errors/user.js';
import { user } from '../../tests/index.js';
import { UpdateUserUseCase } from './update-user.js';
import { User } from '../../domain/entities/user.js';

describe('Update User Use Case', () => {
    class UserRepositoryStub {
        async findByEmail(): Promise<User | null> {
            return null;
        }

        async update(): Promise<User> {
            return user;
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub();
        const updateUserUseCase = new UpdateUserUseCase(userRepository);

        return {
            updateUserUseCase,
            userRepository,
        };
    };

    it('should update user successfully (without email)', async () => {
        const { updateUserUseCase } = makeSut();

        const result = await updateUserUseCase.execute(faker.string.uuid(), {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
        });

        expect(result).toBe(user);
    });

    it('should update user successfully (with email)', async () => {
        const { updateUserUseCase, userRepository } = makeSut();
        const findByEmailSpy = jest.spyOn(userRepository, 'findByEmail');

        const email = faker.internet.email();
        const result = await updateUserUseCase.execute(faker.string.uuid(), {
            email,
        });

        expect(findByEmailSpy).toHaveBeenCalledWith(email);
        expect(result).toBe(user);
    });

    it('should throw EmailAlreadyInUseError if email is already in use', async () => {
        const { updateUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findByEmail').mockResolvedValue({
            ...user,
            id: 'another-user-id',
        });

        const promise = updateUserUseCase.execute(faker.string.uuid(), {
            email: user.email,
        });

        await expect(promise).rejects.toThrow(
            new EmailAlreadyInUseError(user.email),
        );
    });

    it('should call userRepository.update with correct params', async () => {
        const { updateUserUseCase, userRepository } = makeSut();
        const updateSpy = jest.spyOn(userRepository, 'update');

        const updateUserParams = {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        };

        await updateUserUseCase.execute(user.id, updateUserParams);

        expect(updateSpy).toHaveBeenCalledWith(user.id, updateUserParams);
    });

    it('should throw if findByEmail throws', async () => {
        const { updateUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findByEmail').mockRejectedValue(
            new Error(),
        );

        const promise = updateUserUseCase.execute(faker.string.uuid(), {
            email: faker.internet.email(),
        });

        await expect(promise).rejects.toThrow();
    });

    it('should throw if userRepository.update throws', async () => {
        const { updateUserUseCase, userRepository } = makeSut();
        jest.spyOn(userRepository, 'update').mockRejectedValue(new Error());

        const promise = updateUserUseCase.execute(faker.string.uuid(), {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        await expect(promise).rejects.toThrow();
    });
});
